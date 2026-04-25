package provider

import "context"

type Provider interface {
	Name() string
	FetchProgress(ctx context.Context, goalType string, startTime, endTime int64) (uint64, error)
}
