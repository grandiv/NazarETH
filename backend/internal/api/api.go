package api

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/grandiv/nazareth/internal/auth"
	"github.com/grandiv/nazareth/internal/goal"
	"github.com/grandiv/nazareth/internal/oracle"
	"github.com/grandiv/nazareth/internal/provider/hevy"
	"github.com/grandiv/nazareth/internal/provider/strava"
	"github.com/grandiv/nazareth/internal/store"
)

type API struct {
	store             *store.Store
	strava            *strava.StravaProvider
	hevy              *hevy.HevyProvider
	oracle            *oracle.OracleClient
	jwtSecret         string
	stravaRedirectURI string
	frontendURL       string
}

func New(s *store.Store, st *strava.StravaProvider, hv *hevy.HevyProvider, oc *oracle.OracleClient, jwtSecret, stravaRedirectURI, frontendURL string) *API {
	return &API{
		store:             s,
		strava:            st,
		hevy:              hv,
		oracle:            oc,
		jwtSecret:         jwtSecret,
		stravaRedirectURI: stravaRedirectURI,
		frontendURL:       frontendURL,
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (a *API) HandleNonce(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Wallet string `json:"wallet"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if req.Wallet == "" {
		writeError(w, 400, "wallet required")
		return
	}
	nonce := generateNonce()
	siweMsg := fmt.Sprintf(
		"nazareth.xyz wants you to sign in with your Ethereum account:\n%s\n\nSign in to NazarETH\n\nURI: https://nazareth.xyz\nVersion: 1\nChain ID: 84532\nNonce: %s\nIssued At: %s",
		req.Wallet, nonce, time.Now().UTC().Format(time.RFC3339),
	)
	writeJSON(w, 200, map[string]string{"message": siweMsg, "nonce": nonce})
}

func (a *API) HandleVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message   string `json:"message"`
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	address, err := auth.VerifySIWESignature(req.Message, req.Signature)
	if err != nil {
		writeError(w, 401, "invalid signature")
		return
	}
	wallet := address.Hex()
	user, err := a.store.CreateUser(wallet)
	if err != nil {
		writeError(w, 500, "db error")
		return
	}
	token, err := auth.GenerateJWT(wallet, a.jwtSecret)
	if err != nil {
		writeError(w, 500, "token error")
		return
	}
	writeJSON(w, 200, map[string]interface{}{
		"token": token,
		"user":  user,
	})
}

func (a *API) HandleMe(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}
	stravaConnected := false
	if _, err := a.store.GetStravaToken(user.ID); err == nil {
		stravaConnected = true
	}
	hevyConnected := false
	if _, err := a.store.GetHevyAPIKey(user.ID); err == nil {
		hevyConnected = true
	}
	writeJSON(w, 200, map[string]interface{}{
		"user":             user,
		"strava_connected": stravaConnected,
		"hevy_connected":   hevyConnected,
	})
}

func (a *API) HandleStravaAuth(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	state := wallet + ":" + randomHex(16)
	url := a.strava.GetAuthURL(a.stravaRedirectURI, state)
	writeJSON(w, 200, map[string]string{"url": url})
}

func (a *API) HandleStravaCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if code == "" {
		writeError(w, 400, "missing code")
		return
	}
	parts := splitState(state)
	if len(parts) == 0 {
		writeError(w, 400, "invalid state")
		return
	}
	wallet := parts[0]

	user, err := a.store.CreateUser(wallet)
	if err != nil {
		writeError(w, 500, "db error")
		return
	}
	tr, err := a.strava.ExchangeCode(code)
	if err != nil {
		writeError(w, 500, "strava error: "+err.Error())
		return
	}
	if err := a.store.SaveStravaToken(user.ID, tr.AccessToken, tr.RefreshToken, tr.ExpiresAt, tr.Athlete.ID); err != nil {
		writeError(w, 500, "db error")
		return
	}
	http.Redirect(w, r, fmt.Sprintf("%s/register?strava_athlete_id=%d", a.frontendURL, tr.Athlete.ID), http.StatusFound)
}

func (a *API) HandleHevyConnect(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}
	var req struct {
		APIKey string `json:"api_key"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.APIKey == "" {
		writeError(w, 400, "api_key required")
		return
	}
	if err := a.store.SaveHevyAPIKey(user.ID, req.APIKey); err != nil {
		writeError(w, 500, "db error")
		return
	}
	writeJSON(w, 200, map[string]string{"status": "connected"})
}

func (a *API) HandleCreateGoal(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}
	var req goal.CreateGoalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if req.TargetValue == 0 {
		writeError(w, 400, "target_value required")
		return
	}
	if req.Deadline <= time.Now().Unix() {
		writeError(w, 400, "deadline must be in the future")
		return
	}
	if req.Provider != goal.ProviderStrava && req.Provider != goal.ProviderHevy {
		writeError(w, 400, "invalid provider")
		return
	}
	if req.GoalType != goal.GoalTypeDistance && req.GoalType != goal.GoalTypeCount {
		writeError(w, 400, "invalid goal_type")
		return
	}

	g := &goal.Goal{
		UserID:      user.ID,
		Provider:    req.Provider,
		GoalType:    req.GoalType,
		TargetValue: req.TargetValue,
		Deadline:    req.Deadline,
		StakeAmount: "0",
		Status:      goal.StatusActive,
	}
	if err := a.store.CreateGoal(g); err != nil {
		writeError(w, 500, "db error")
		return
	}
	writeJSON(w, 201, g)
}

func (a *API) HandleListGoals(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}
	goals, err := a.store.ListGoalsByUser(user.ID)
	if err != nil {
		writeError(w, 500, "db error")
		return
	}
	if goals == nil {
		goals = []*goal.Goal{}
	}
	writeJSON(w, 200, goals)
}

func (a *API) HandleGetGoal(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, 400, "invalid goal id")
		return
	}
	g, err := a.store.GetGoalByID(id)
	if err != nil {
		writeError(w, 404, "goal not found")
		return
	}
	wallet := auth.GetWalletFromContext(r.Context())
	user, _ := a.store.GetUserByWallet(wallet)
	if g.UserID != user.ID {
		writeError(w, 403, "not your goal")
		return
	}
	writeJSON(w, 200, g)
}

func (a *API) HandleGoalProgress(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, 400, "invalid goal id")
		return
	}
	g, err := a.store.GetGoalByID(id)
	if err != nil {
		writeError(w, 404, "goal not found")
		return
	}
	wallet := auth.GetWalletFromContext(r.Context())
	user, _ := a.store.GetUserByWallet(wallet)
	if g.UserID != user.ID {
		writeError(w, 403, "not your goal")
		return
	}

	var actualValue uint64
	now := time.Now().Unix()

	switch g.Provider {
	case goal.ProviderStrava:
		startTime := g.CreatedAt
		endTime := now
		if now > g.Deadline {
			endTime = g.Deadline
		}
		actualValue, err = a.strava.FetchProgressForUser(r.Context(), user.ID, string(g.GoalType), startTime, endTime)
		if err != nil {
			writeError(w, 500, "strava fetch error: "+err.Error())
			return
		}
	case goal.ProviderHevy:
		apiKey, err2 := a.store.GetHevyAPIKey(user.ID)
		if err2 != nil {
			writeError(w, 400, "hevy not connected")
			return
		}
		startTime := g.CreatedAt
		endTime := now
		if now > g.Deadline {
			endTime = g.Deadline
		}
		actualValue, err = a.hevy.FetchProgressWithKey(r.Context(), apiKey, string(g.GoalType), startTime, endTime)
		if err != nil {
			writeError(w, 500, "hevy fetch error: "+err.Error())
			return
		}
	}

	_ = a.store.UpdateGoalProgress(g.ID, actualValue)

	pct := int((actualValue * 100) / g.TargetValue)
	if pct > 100 {
		pct = 100
	}
	var remaining int64
	if g.Deadline > now {
		remaining = g.Deadline - now
	}

	writeJSON(w, 200, goal.ProgressResponse{
		GoalID:        uint64(g.ID),
		TargetValue:   g.TargetValue,
		ActualValue:   actualValue,
		ProgressPct:   pct,
		TimeRemaining: remaining,
	})
}

func (a *API) HandleSettleGoal(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, 400, "invalid goal id")
		return
	}
	g, err := a.store.GetGoalByID(id)
	if err != nil {
		writeError(w, 404, "goal not found")
		return
	}
	wallet := auth.GetWalletFromContext(r.Context())
	user, _ := a.store.GetUserByWallet(wallet)
	if g.UserID != user.ID {
		writeError(w, 403, "not your goal")
		return
	}
	if g.Settled {
		writeError(w, 400, "already settled")
		return
	}
	if g.ContractID == nil {
		writeError(w, 400, "goal not deposited on-chain")
		return
	}
	if time.Now().Unix() < g.Deadline {
		writeError(w, 400, "deadline not passed")
		return
	}
	if a.oracle == nil {
		writeError(w, 500, "oracle not configured")
		return
	}

	var actualValue uint64
	switch g.Provider {
	case goal.ProviderStrava:
		actualValue, err = a.strava.FetchProgressForUser(r.Context(), user.ID, string(g.GoalType), g.CreatedAt, g.Deadline)
		if err != nil {
			writeError(w, 500, "strava fetch: "+err.Error())
			return
		}
	case goal.ProviderHevy:
		apiKey, err2 := a.store.GetHevyAPIKey(user.ID)
		if err2 != nil {
			writeError(w, 400, "hevy not connected")
			return
		}
		actualValue, err = a.hevy.FetchProgressWithKey(r.Context(), apiKey, string(g.GoalType), g.CreatedAt, g.Deadline)
		if err != nil {
			writeError(w, 500, "hevy fetch: "+err.Error())
			return
		}
	}

	progressBps := uint64((actualValue * 10000) / g.TargetValue)
	if progressBps > 10000 {
		progressBps = 10000
	}
	reportedAt := uint64(time.Now().Unix())
	contractID := uint64(*g.ContractID)
	walletAddr := common.HexToAddress(wallet)

	txHash, err := a.oracle.SubmitProgress(r.Context(), walletAddr, contractID, progressBps, reportedAt)
	if err != nil {
		writeError(w, 500, "oracle submit error: "+err.Error())
		return
	}

	status := goal.StatusAchieved
	if actualValue < g.TargetValue {
		status = goal.StatusFailed
	}
	_ = a.store.SettleGoal(g.ID, actualValue, status)

	writeJSON(w, 200, map[string]interface{}{
		"tx_hash":       txHash.Hex(),
		"progress_bps":  progressBps,
		"actual_value":  actualValue,
		"status":        status,
	})
}

func (a *API) HandleUpdateContractID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, 400, "invalid goal id")
		return
	}
	g, err := a.store.GetGoalByID(id)
	if err != nil {
		writeError(w, 404, "goal not found")
		return
	}
	wallet := auth.GetWalletFromContext(r.Context())
	user, _ := a.store.GetUserByWallet(wallet)
	if g.UserID != user.ID {
		writeError(w, 403, "not your goal")
		return
	}
	var req struct {
		ContractID  int64  `json:"contract_id"`
		StakeAmount string `json:"stake_amount"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if err := a.store.UpdateGoalContractID(id, req.ContractID); err != nil {
		writeError(w, 500, "db error")
		return
	}
	if req.StakeAmount != "" {
		_ = a.store.UpdateGoalDeposit(id, req.StakeAmount)
	}
	writeJSON(w, 200, map[string]string{"status": "updated"})
}

func (a *API) HandleRegistrySign(w http.ResponseWriter, r *http.Request) {
	if a.oracle == nil {
		writeError(w, 500, "oracle not configured")
		return
	}
	var req struct {
		Wallet    string `json:"wallet"`
		StravaID  string `json:"strava_athlete_id"`
		Nonce     string `json:"nonce"`
		Deadline  string `json:"deadline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if req.Wallet == "" || req.StravaID == "" {
		writeError(w, 400, "wallet and strava_athlete_id required")
		return
	}
	stravaID, _ := strconv.ParseUint(req.StravaID, 10, 64)
	nonce, _ := strconv.ParseUint(req.Nonce, 10, 64)
	deadline, _ := strconv.ParseUint(req.Deadline, 10, 64)
	if stravaID == 0 {
		writeError(w, 400, "strava_athlete_id must be > 0")
		return
	}

	sig, err := a.oracle.SignRegistryRegistration(common.HexToAddress(req.Wallet), stravaID, nonce, deadline)
	if err != nil {
		writeError(w, 500, "signing error: "+err.Error())
		return
	}

	writeJSON(w, 200, map[string]interface{}{
		"signature": fmt.Sprintf("0x%x", sig),
		"signer":    a.oracle.Address().Hex(),
	})
}

func (a *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]string{"status": "ok"})
}

func (a *API) HandleChallengeSync(w http.ResponseWriter, r *http.Request) {
	if a.oracle == nil {
		writeError(w, 500, "oracle not configured")
		return
	}
	var req struct {
		ChallengeID string `json:"challenge_id"`
		Wallet      string `json:"wallet"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if req.ChallengeID == "" || req.Wallet == "" {
		writeError(w, 400, "challenge_id and wallet required")
		return
	}
	challengeID, _ := strconv.ParseUint(req.ChallengeID, 10, 64)
	if challengeID == 0 {
		writeError(w, 400, "invalid challenge_id")
		return
	}
	walletAddr := common.HexToAddress(req.Wallet)

	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}

	token, err := a.store.GetStravaToken(user.ID)
	if err != nil {
		writeError(w, 400, "strava not connected for this user")
		return
	}

	_ = token

	deadline, err := a.oracle.GetChallengeDeadline(r.Context(), challengeID)
	if err != nil {
		writeError(w, 500, "failed to read challenge deadline: "+err.Error())
		return
	}

	if uint64(time.Now().Unix()) > deadline+120 {
		txHash, err := a.oracle.FinalizeProgress(r.Context(), walletAddr, challengeID)
		if err != nil {
			writeError(w, 500, "auto-finalize error: "+err.Error())
			return
		}
		writeJSON(w, 200, map[string]interface{}{
			"auto_finalized": true,
			"tx_hash":        txHash.Hex(),
			"message":        "deadline passed — challenge finalized automatically",
		})
		return
	}

	challengeStart, err := a.store.GetOrCreateChallengeStart(int64(challengeID), user.ID)
	if err != nil {
		writeError(w, 500, "db error: "+err.Error())
		return
	}

	actualDistance, err := a.strava.FetchProgressForUser(r.Context(), user.ID, "distance", challengeStart, time.Now().Unix())
	if err != nil {
		writeError(w, 500, "strava fetch error: "+err.Error())
		return
	}

	targetDistance, err := a.oracle.GetChallengeTarget(r.Context(), challengeID)
	if err != nil {
		writeError(w, 500, "failed to read challenge target: "+err.Error())
		return
	}

	progressBps := uint64(0)
	if targetDistance > 0 {
		progressBps = (actualDistance * 10000) / targetDistance
	}
	if progressBps > 10000 {
		progressBps = 10000
	}

	txHash, err := a.oracle.SubmitProgress(r.Context(), walletAddr, challengeID, progressBps, uint64(time.Now().Unix()))
	if err != nil {
		writeError(w, 500, "oracle tx error: "+err.Error())
		return
	}

	writeJSON(w, 200, map[string]interface{}{
		"tx_hash":      txHash.Hex(),
		"progress_bps": progressBps,
		"actual_m":     actualDistance,
		"target_m":     targetDistance,
	})
}

func generateNonce() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1e18))
	return fmt.Sprintf("%d", n)
}

func (a *API) HandleStravaActivities(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}

	afterStr := r.URL.Query().Get("after")
	beforeStr := r.URL.Query().Get("before")
	after := int64(0)
	before := time.Now().Unix()
	if afterStr != "" {
		after, _ = strconv.ParseInt(afterStr, 10, 64)
	}
	if beforeStr != "" {
		before, _ = strconv.ParseInt(beforeStr, 10, 64)
	}

	activities, err := a.strava.FetchActivities(r.Context(), user.ID, after, before)
	if err != nil {
		writeError(w, 500, "strava fetch error: "+err.Error())
		return
	}
	if activities == nil {
		activities = []strava.ActivityWithRoute{}
	}
	writeJSON(w, 200, activities)
}

func (a *API) HandleStravaUploadRun(w http.ResponseWriter, r *http.Request) {
	wallet := auth.GetWalletFromContext(r.Context())
	user, err := a.store.GetUserByWallet(wallet)
	if err != nil {
		writeError(w, 404, "user not found")
		return
	}
	var req struct {
		Name   string        `json:"name"`
		Points [][2]float64  `json:"points"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, 400, "invalid body")
		return
	}
	if len(req.Points) < 2 {
		writeError(w, 400, "need at least 2 points")
		return
	}
	if req.Name == "" {
		req.Name = "NazarETH Run"
	}

	activityID, distM, pace, err := a.strava.UploadGpxRun(r.Context(), user.ID, req.Name, req.Points)
	if err != nil {
		writeError(w, 500, "strava upload error: "+err.Error())
		return
	}

	writeJSON(w, 200, map[string]interface{}{
		"activity_id": activityID,
		"distance_m":  math.Round(distM),
		"pace":        pace,
		"points":      len(req.Points),
	})
}

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func splitState(state string) []string {
	parts := make([]string, 0, 2)
	for i, ch := range state {
		if ch == ':' {
			parts = append(parts, state[:i])
			if i+1 < len(state) {
				parts = append(parts, state[i+1:])
			}
			return parts
		}
	}
	return parts
}
