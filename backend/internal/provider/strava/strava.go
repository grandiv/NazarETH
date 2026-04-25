package strava

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/grandiv/nazareth/internal/provider"
	"github.com/grandiv/nazareth/internal/store"
)

type StravaProvider struct {
	clientID     string
	clientSecret string
	store        *store.Store
}

func New(clientID, clientSecret string, s *store.Store) *StravaProvider {
	return &StravaProvider{clientID: clientID, clientSecret: clientSecret, store: s}
}

func (p *StravaProvider) Name() string { return "strava" }

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
	Athlete      struct {
		ID int64 `json:"id"`
	} `json:"athlete"`
}

func (p *StravaProvider) ExchangeCode(code string) (*tokenResponse, error) {
	data := url.Values{
		"client_id":     {p.clientID},
		"client_secret": {p.clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
	}
	resp, err := http.PostForm("https://www.strava.com/oauth/token", data)
	if err != nil {
		return nil, fmt.Errorf("strava token exchange: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("strava token error (%d): %s", resp.StatusCode, body)
	}
	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return nil, fmt.Errorf("strava token parse: %w", err)
	}
	return &tr, nil
}

func (p *StravaProvider) RefreshToken(refreshToken string) (*tokenResponse, error) {
	data := url.Values{
		"client_id":     {p.clientID},
		"client_secret": {p.clientSecret},
		"refresh_token": {refreshToken},
		"grant_type":    {"refresh_token"},
	}
	resp, err := http.PostForm("https://www.strava.com/oauth/token", data)
	if err != nil {
		return nil, fmt.Errorf("strava refresh: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("strava refresh error (%d): %s", resp.StatusCode, body)
	}
	var tr tokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return nil, fmt.Errorf("strava refresh parse: %w", err)
	}
	return &tr, nil
}

func (p *StravaProvider) getAccessToken(userID int64) (string, error) {
	tok, err := p.store.GetStravaToken(userID)
	if err != nil {
		return "", fmt.Errorf("no strava token for user %d: %w", userID, err)
	}
	if time.Now().Unix() < tok.ExpiresAt-60 {
		return tok.AccessToken, nil
	}
	tr, err := p.RefreshToken(tok.RefreshToken)
	if err != nil {
		return "", err
	}
	tok.AccessToken = tr.AccessToken
	tok.RefreshToken = tr.RefreshToken
	tok.ExpiresAt = tr.ExpiresAt
	if err := p.store.UpdateStravaToken(tok); err != nil {
		return "", err
	}
	return tok.AccessToken, nil
}

type activitySummary struct {
	Distance float64 `json:"distance"`
	Type     string  `json:"type"`
}

func (p *StravaProvider) FetchProgress(ctx context.Context, goalType string, startTime, endTime int64) (uint64, error) {
	return 0, fmt.Errorf("use FetchProgressForUser instead")
}

func (p *StravaProvider) FetchProgressForUser(ctx context.Context, userID int64, goalType string, startTime, endTime int64) (uint64, error) {
	token, err := p.getAccessToken(userID)
	if err != nil {
		return 0, err
	}

	page := 1
	var totalDistance uint64
	var totalCount uint64

	for {
		u := fmt.Sprintf("https://www.strava.com/api/v3/athlete/activities?before=%d&after=%d&page=%d&per_page=100",
			endTime, startTime, page)
		req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return 0, fmt.Errorf("strava activities: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 200 {
			return 0, fmt.Errorf("strava activities error (%d): %s", resp.StatusCode, body)
		}
		var activities []activitySummary
		if err := json.Unmarshal(body, &activities); err != nil {
			return 0, fmt.Errorf("strava activities parse: %w", err)
		}
		if len(activities) == 0 {
			break
		}
		for _, a := range activities {
			switch goalType {
			case "distance":
				totalDistance += uint64(a.Distance)
			case "count":
				totalCount++
			}
		}
		if len(activities) < 100 {
			break
		}
		page++
	}

	switch goalType {
	case "distance":
		return totalDistance, nil
	case "count":
		return totalCount, nil
	default:
		return 0, fmt.Errorf("unknown goal type: %s", goalType)
	}
}

func (p *StravaProvider) GetAuthURL(redirectURI, state string) string {
	return fmt.Sprintf(
		"https://www.strava.com/oauth/authorize?client_id=%s&response_type=code&redirect_uri=%s&approval_prompt=auto&scope=read,activity:read_all&state=%s",
		p.clientID, url.QueryEscape(redirectURI), state,
	)
}

func ParseDistanceToKm(meters uint64) string {
	return strconv.FormatFloat(float64(meters)/1000.0, 'f', 2, 64)
}

var _ provider.Provider = (*StravaProvider)(nil)
