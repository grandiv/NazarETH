package goal

import "time"

type GoalType string

const (
	GoalTypeDistance GoalType = "distance"
	GoalTypeCount    GoalType = "count"
)

type GoalStatus string

const (
	StatusActive   GoalStatus = "active"
	StatusAchieved GoalStatus = "achieved"
	StatusFailed   GoalStatus = "failed"
	StatusClaimed  GoalStatus = "claimed"
)

type Provider string

const (
	ProviderStrava Provider = "strava"
	ProviderHevy   Provider = "hevy"
)

type User struct {
	ID            int64  `json:"id"`
	WalletAddress string `json:"wallet_address"`
	CreatedAt     int64  `json:"created_at"`
}

type Goal struct {
	ID           int64      `json:"id"`
	UserID       int64      `json:"user_id"`
	Provider     Provider   `json:"provider"`
	ProviderUID  string     `json:"provider_uid"`
	GoalType     GoalType   `json:"goal_type"`
	TargetValue  uint64     `json:"target_value"`
	Deadline     int64      `json:"deadline"`
	StakeAmount  string     `json:"stake_amount"`
	ActualValue  uint64     `json:"actual_value"`
	DepositedAt  int64      `json:"deposited_at"`
	Status       GoalStatus `json:"status"`
	ContractID   *int64     `json:"contract_id"`
	Settled      bool       `json:"settled"`
	CreatedAt    int64      `json:"created_at"`
}

type StravaToken struct {
	ID           int64  `json:"id"`
	UserID       int64  `json:"user_id"`
	AccessToken  string `json:"-"`
	RefreshToken string `json:"-"`
	ExpiresAt    int64  `json:"expires_at"`
	StravaAthleteID int64 `json:"strava_athlete_id"`
}

type CreateGoalRequest struct {
	Provider    Provider `json:"provider"`
	GoalType    GoalType `json:"goal_type"`
	TargetValue uint64   `json:"target_value"`
	Deadline    int64    `json:"deadline"`
	StakeAmount string   `json:"stake_amount"`
}

type ProgressResponse struct {
	GoalID       uint64 `json:"goal_id"`
	TargetValue  uint64 `json:"target_value"`
	ActualValue  uint64 `json:"actual_value"`
	ProgressPct  int    `json:"progress_pct"`
	TimeRemaining int64 `json:"time_remaining_seconds"`
}

type SettleRequest struct {
	GoalID int64 `json:"goal_id"`
}

func (g *Goal) IsExpired() bool {
	return time.Now().Unix() > g.Deadline
}

func (g *Goal) ProgressPct() int {
	if g.TargetValue == 0 {
		return 0
	}
	pct := int((g.ActualValue * 100) / g.TargetValue)
	if pct > 100 {
		return 100
	}
	return pct
}
