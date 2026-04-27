package strava

import (
	"bytes"
	"context"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"math"
	"mime/multipart"
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
	Distance        float64 `json:"distance"`
	Type            string  `json:"type"`
	MapSummaryPolyline string `json:"map_summary_polyline"`
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
		"https://www.strava.com/oauth/authorize?client_id=%s&response_type=code&redirect_uri=%s&approval_prompt=auto&scope=read,activity:read_all,activity:write&state=%s",
		p.clientID, url.QueryEscape(redirectURI), state,
	)
}

func ParseDistanceToKm(meters uint64) string {
	return strconv.FormatFloat(float64(meters)/1000.0, 'f', 2, 64)
}

type ActivityWithRoute struct {
	ID             int64   `json:"id"`
	Name           string  `json:"name"`
	Distance       float64 `json:"distance"`
	Type           string  `json:"type"`
	StartDate      string  `json:"start_date"`
	SummaryPolyline string `json:"summary_polyline"`
}

func (p *StravaProvider) FetchActivities(ctx context.Context, userID int64, after, before int64) ([]ActivityWithRoute, error) {
	token, err := p.getAccessToken(userID)
	if err != nil {
		return nil, err
	}

	var all []ActivityWithRoute
	page := 1

	for {
		u := fmt.Sprintf("https://www.strava.com/api/v3/athlete/activities?before=%d&after=%d&page=%d&per_page=100",
			before, after, page)
		req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("strava activities: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 200 {
			return nil, fmt.Errorf("strava activities error (%d): %s", resp.StatusCode, body)
		}

		var raw []struct {
			ID        int64   `json:"id"`
			Name      string  `json:"name"`
			Distance  float64 `json:"distance"`
			Type      string  `json:"type"`
			StartDate string  `json:"start_date"`
			Map       struct {
				SummaryPolyline string `json:"summary_polyline"`
			} `json:"map"`
		}
		if err := json.Unmarshal(body, &raw); err != nil {
			return nil, fmt.Errorf("strava activities parse: %w", err)
		}
		if len(raw) == 0 {
			break
		}
		for _, a := range raw {
			if a.Map.SummaryPolyline != "" {
				all = append(all, ActivityWithRoute{
					ID:              a.ID,
					Name:            a.Name,
					Distance:        a.Distance,
					Type:            a.Type,
					StartDate:       a.StartDate,
					SummaryPolyline: a.Map.SummaryPolyline,
				})
			}
		}
		if len(raw) < 100 {
			break
		}
		page++
	}
	return all, nil
}

type gpxTrackpoint struct {
	XMLName xml.Name `xml:"trkpt"`
	Lat     float64  `xml:"lat,attr"`
	Lon     float64  `xml:"lon,attr"`
	Time    string   `xml:"time"`
}

type gpxTrack struct {
	XMLName xml.Name        `xml:"trk"`
	Name    string          `xml:"name"`
	TrkSeg  []gpxTrackpoint `xml:"trkseg>trkpt"`
}

type gpxFile struct {
	XMLName xml.Name `xml:"gpx"`
	Version string   `xml:"version,attr"`
	XMLNS   string   `xml:"xmlns,attr"`
	Track   gpxTrack `xml:"trk"`
}

func (p *StravaProvider) UploadGpxRun(ctx context.Context, userID int64, name string, points [][2]float64) (int64, float64, string, error) {
	token, err := p.getAccessToken(userID)
	if err != nil {
		return 0, 0, "", err
	}

	totalDist := 0.0
	speed := 2.78
	startTime := time.Now().Add(-time.Duration(int(len(points)*30)) * time.Minute)
	trackpoints := make([]gpxTrackpoint, len(points))
	elapsed := 0.0

	for i, pt := range points {
		if i > 0 {
			d := haversineFloat(points[i-1][0], points[i-1][1], pt[0], pt[1])
			totalDist += d
			elapsed += d / speed
		}
		t := startTime.Add(time.Duration(elapsed) * time.Second)
		trackpoints[i] = gpxTrackpoint{
			Lat:  pt[0],
			Lon:  pt[1],
			Time: t.UTC().Format("2006-01-02T15:04:05Z"),
		}
	}

	gpx := gpxFile{
		Version: "1.1",
		XMLNS:   "http://www.topografix.com/GPX/1/1",
		Track: gpxTrack{
			Name:   name,
			TrkSeg: trackpoints,
		},
	}

	gpxBytes, err := xml.MarshalIndent(gpx, "", "  ")
	if err != nil {
		return 0, 0, "", fmt.Errorf("gpx marshal: %w", err)
	}
	gpxData := append([]byte(xml.Header), gpxBytes...)

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", "run.gpx")
	if err != nil {
		return 0, 0, "", fmt.Errorf("multipart: %w", err)
	}
	part.Write(gpxData)
	writer.WriteField("data_type", "gpx")
	writer.WriteField("name", name)
	writer.WriteField("activity_type", "run")
	writer.Close()

	req, err := http.NewRequestWithContext(ctx, "POST", "https://www.strava.com/api/v3/uploads", &buf)
	if err != nil {
		return 0, 0, "", err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, 0, "", fmt.Errorf("strava upload: %w", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		return 0, 0, "", fmt.Errorf("strava upload error (%d): %s", resp.StatusCode, body)
	}

	var uploadResp struct {
		ID         int64  `json:"id"`
		ActivityID int64  `json:"activity_id"`
		Status     string `json:"status"`
	}
	if err := json.Unmarshal(body, &uploadResp); err != nil {
		return 0, totalDist, "", nil
	}

	totalSeconds := elapsed
	paceSeconds := 0.0
	if totalDist > 0 {
		paceSeconds = (totalSeconds / totalDist) * 1000
	}
	paceStr := fmt.Sprintf("%d:%02d /km", int(paceSeconds)/60, int(paceSeconds)%60)

	activityID := uploadResp.ActivityID
	if activityID == 0 {
		for i := 0; i < 10; i++ {
			time.Sleep(2 * time.Second)
			checkReq, _ := http.NewRequestWithContext(ctx, "GET",
				fmt.Sprintf("https://www.strava.com/api/v3/uploads/%d", uploadResp.ID), nil)
			checkReq.Header.Set("Authorization", "Bearer "+token)
			checkResp, err := http.DefaultClient.Do(checkReq)
			if err != nil {
				continue
			}
			checkBody, _ := io.ReadAll(checkResp.Body)
			checkResp.Body.Close()
			var check struct {
				ActivityID int64  `json:"activity_id"`
				Status     string `json:"status"`
			}
			json.Unmarshal(checkBody, &check)
			if check.ActivityID > 0 {
				activityID = check.ActivityID
				break
			}
			if check.Status == "There was an error processing your activity." {
				return 0, totalDist, paceStr, fmt.Errorf("strava processing error")
			}
		}
	}

	return activityID, totalDist, paceStr, nil
}

func haversineFloat(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000
	toRad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	return R * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}

func (p *StravaProvider) CreateRun(ctx context.Context, userID int64, name string, distanceMeters float64, durationSeconds int) (int64, error) {
	token, err := p.getAccessToken(userID)
	if err != nil {
		return 0, err
	}

	startTime := time.Now().Add(-time.Duration(durationSeconds) * time.Second)
	data := url.Values{
		"name":             {name},
		"type":             {"Run"},
		"start_date_local": {startTime.Format("2006-01-02T15:04:05Z")},
		"elapsed_time":     {strconv.Itoa(durationSeconds)},
		"distance":         {strconv.FormatFloat(distanceMeters, 'f', 2, 64)},
	}
	req, err := http.NewRequestWithContext(ctx, "POST", "https://www.strava.com/api/v3/activities?"+data.Encode(), nil)
	if err != nil {
		return 0, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, fmt.Errorf("strava create activity: %w", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != 201 && resp.StatusCode != 200 {
		return 0, fmt.Errorf("strava create error (%d): %s", resp.StatusCode, body)
	}
	var result struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return 0, fmt.Errorf("strava create parse: %w", err)
	}
	return result.ID, nil
}

var _ provider.Provider = (*StravaProvider)(nil)
