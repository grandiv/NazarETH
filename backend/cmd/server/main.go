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
	"github.com/grandiv/nazareth/internal/oracle"
	"github.com/grandiv/nazareth/internal/provider/hevy"
	"github.com/grandiv/nazareth/internal/provider/strava"
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

	var oracleClient *oracle.OracleClient
	if cfg.SignerPrivateKey != "" {
		oracleClient, err = oracle.New(cfg.RPCURL, cfg.SignerPrivateKey, cfg.OracleAddress, cfg.RegistryAddress, cfg.ChallengeAddress, 84532)
		if err != nil {
			log.Fatalf("init oracle: %v", err)
		}
		log.Printf("Oracle address: %s", oracleClient.Address().Hex())
	} else {
		log.Println("WARNING: oracle not configured (no BACKEND_SIGNER_PRIVATE_KEY)")
	}

	handler := api.New(s, stravaProv, hevyProv, oracleClient, cfg.JWTSecret, cfg.StravaRedirectURI, "http://localhost:5173", cfg.ChallengeAddress)

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
	mux.Handle("POST /api/goals/{id}/progress", authed(http.HandlerFunc(handler.HandleGoalProgress)))
	mux.Handle("POST /api/goals/{id}/settle", authed(http.HandlerFunc(handler.HandleSettleGoal)))
	mux.Handle("POST /api/goals/{id}/contract", authed(http.HandlerFunc(handler.HandleUpdateContractID)))
	mux.Handle("POST /api/registry/sign", authed(http.HandlerFunc(handler.HandleRegistrySign)))
	mux.Handle("POST /api/challenge/sync", authed(http.HandlerFunc(handler.HandleChallengeSync)))
	mux.Handle("POST /api/strava/upload-run", authed(http.HandlerFunc(handler.HandleStravaUploadRun)))
	mux.Handle("GET /api/strava/activities", authed(http.HandlerFunc(handler.HandleStravaActivities)))
	mux.Handle("GET /api/strava/streams/{id}", authed(http.HandlerFunc(handler.HandleStravaStreams)))

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
