package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/grandiv/nazareth/internal/api"
	"github.com/grandiv/nazareth/internal/auth"
	"github.com/grandiv/nazareth/internal/config"
	"github.com/grandiv/nazareth/internal/provider/hevy"
	"github.com/grandiv/nazareth/internal/provider/strava"
	"github.com/grandiv/nazareth/internal/signer"
	"github.com/grandiv/nazareth/internal/store"
)

func main() {
	cfg := config.Load()

	if err := os.MkdirAll(filepath.Dir(cfg.DatabasePath), 0755); err != nil {
		log.Fatalf("create db dir: %v", err)
	}

	s, err := store.New(cfg.DatabasePath)
	if err != nil {
		log.Fatalf("open store: %v", err)
	}
	defer s.Close()

	stravaProv := strava.New(cfg.StravaClientID, cfg.StravaClientSecret, s)
	hevyProv := hevy.New(cfg.HevyAPIKey)

	var eip712Signer *signer.EIP712Signer
	if cfg.SignerPrivateKey != "" && cfg.GoalVaultAddress != "" {
		eip712Signer, err = signer.New(cfg.SignerPrivateKey, cfg.GoalVaultAddress, 84532)
		if err != nil {
			log.Fatalf("init signer: %v", err)
		}
		log.Printf("Signer address: %s", eip712Signer.Address().Hex())
	} else {
		log.Println("WARNING: signer not configured (no BACKEND_SIGNER_PRIVATE_KEY or GOAL_VAULT_ADDRESS)")
	}

	handler := api.New(s, stravaProv, hevyProv, eip712Signer, cfg.JWTSecret, cfg.StravaRedirectURI, "http://localhost:5173")

	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", handler.HandleHealth)
	mux.HandleFunc("POST /auth/nonce", handler.HandleNonce)
	mux.HandleFunc("POST /auth/verify", handler.HandleVerify)
	mux.HandleFunc("GET /auth/strava/callback", handler.HandleStravaCallback)

	authed := auth.JWTMiddleware(cfg.JWTSecret)

	mux.Handle("GET /auth/strava", authed(http.HandlerFunc(handler.HandleStravaAuth)))

	mux.Handle("GET /api/me", authed(http.HandlerFunc(handler.HandleMe)))
	mux.Handle("POST /api/hevy/connect", authed(http.HandlerFunc(handler.HandleHevyConnect)))
	mux.Handle("POST /api/goals", authed(http.HandlerFunc(handler.HandleCreateGoal)))
	mux.Handle("GET /api/goals", authed(http.HandlerFunc(handler.HandleListGoals)))
	mux.Handle("GET /api/goals/{id}", authed(http.HandlerFunc(handler.HandleGetGoal)))
	mux.Handle("GET /api/goals/{id}/progress", authed(http.HandlerFunc(handler.HandleGoalProgress)))
	mux.Handle("POST /api/goals/{id}/settle", authed(http.HandlerFunc(handler.HandleSettleGoal)))
	mux.Handle("POST /api/goals/{id}/contract", authed(http.HandlerFunc(handler.HandleUpdateContractID)))

	corsMux := cors(mux)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("NazarETH backend starting on %s", addr)
	log.Fatal(http.ListenAndServe(addr, corsMux))
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(204)
			return
		}
		next.ServeHTTP(w, r)
	})
}
