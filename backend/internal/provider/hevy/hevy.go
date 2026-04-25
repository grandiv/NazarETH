package hevy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/grandiv/nazareth/internal/provider"
)

type HevyProvider struct {
	defaultAPIKey string
}

func New(apiKey string) *HevyProvider {
	return &HevyProvider{defaultAPIKey: apiKey}
}

func (p *HevyProvider) Name() string { return "hevy" }

type hevyWorkout struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	StartTime string `json:"start_time"`
}

type hevyResponse struct {
	Workouts []hevyWorkout `json:"workouts"`
	Page     int           `json:"page"`
	Pages    int           `json:"pages"`
}

func (p *HevyProvider) FetchProgress(ctx context.Context, goalType string, startTime, endTime int64) (uint64, error) {
	return 0, fmt.Errorf("use FetchProgressWithKey instead")
}

func (p *HevyProvider) FetchProgressWithKey(ctx context.Context, apiKey, goalType string, startTime, endTime int64) (uint64, error) {
	page := 1
	var count uint64

	for {
		u := fmt.Sprintf("https://api.hevyapp.com/v1/workouts?page=%d&pageSize=10&startDate=%s&endDate=%s",
			page,
			time.Unix(startTime, 0).Format("2006-01-02"),
			time.Unix(endTime, 0).Format("2006-01-02"),
		)
		req, _ := http.NewRequestWithContext(ctx, "GET", u, nil)
		req.Header.Set("api-key", apiKey)
		req.Header.Set("Accept", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return 0, fmt.Errorf("hevy workouts: %w", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != 200 {
			return 0, fmt.Errorf("hevy error (%d): %s", resp.StatusCode, body)
		}
		var hr hevyResponse
		if err := json.Unmarshal(body, &hr); err != nil {
			return 0, fmt.Errorf("hevy parse: %w", err)
		}
		count += uint64(len(hr.Workouts))
		if page >= hr.Pages || len(hr.Workouts) == 0 {
			break
		}
		page++
	}
	return count, nil
}

var _ provider.Provider = (*HevyProvider)(nil)
