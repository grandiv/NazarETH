package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"

	"github.com/grandiv/nazareth/internal/goal"
)

type Store struct {
	db *sql.DB
}

func New(path string) (*Store, error) {
	db, err := sql.Open("sqlite3", path+"?_journal_mode=WAL&_foreign_keys=on")
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return s, nil
}

func (s *Store) Close() error { return s.db.Close() }

func (s *Store) migrate() error {
	_, err := s.db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		wallet_address TEXT NOT NULL UNIQUE,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);
	CREATE TABLE IF NOT EXISTS strava_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		strava_athlete_id INTEGER NOT NULL
	);
	CREATE TABLE IF NOT EXISTS hevy_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
		api_key TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS goals (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL REFERENCES users(id),
		provider TEXT NOT NULL,
		goal_type TEXT NOT NULL,
		target_value INTEGER NOT NULL,
		deadline INTEGER NOT NULL,
		stake_amount TEXT NOT NULL DEFAULT '0',
		actual_value INTEGER NOT NULL DEFAULT 0,
		deposited_at INTEGER NOT NULL DEFAULT 0,
		status TEXT NOT NULL DEFAULT 'active',
		contract_id INTEGER,
		settled INTEGER NOT NULL DEFAULT 0,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);
	CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
	CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
	CREATE TABLE IF NOT EXISTS challenge_sync_state (
		challenge_id INTEGER NOT NULL,
		contract_address TEXT NOT NULL DEFAULT '',
		user_id INTEGER NOT NULL REFERENCES users(id),
		start_time INTEGER NOT NULL,
		last_sync INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (challenge_id, contract_address)
	);
	`)
	return err
}

func (s *Store) CreateUser(wallet string) (*goal.User, error) {
	res, err := s.db.Exec("INSERT OR IGNORE INTO users (wallet_address) VALUES (?)", wallet)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	if id == 0 {
		err = s.db.QueryRow("SELECT id FROM users WHERE wallet_address = ?", wallet).Scan(&id)
		if err != nil {
			return nil, err
		}
	}
	return &goal.User{ID: id, WalletAddress: wallet}, nil
}

func (s *Store) GetUserByWallet(wallet string) (*goal.User, error) {
	u := &goal.User{}
	err := s.db.QueryRow("SELECT id, wallet_address, created_at FROM users WHERE wallet_address = ?", wallet).
		Scan(&u.ID, &u.WalletAddress, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) GetUserByID(id int64) (*goal.User, error) {
	u := &goal.User{}
	err := s.db.QueryRow("SELECT id, wallet_address, created_at FROM users WHERE id = ?", id).
		Scan(&u.ID, &u.WalletAddress, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) SaveStravaToken(userID int64, accessToken, refreshToken string, expiresAt, athleteID int64) error {
	_, err := s.db.Exec(`
		INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at, strava_athlete_id)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(user_id) DO UPDATE SET access_token=excluded.access_token, refresh_token=excluded.refresh_token, expires_at=excluded.expires_at
	`, userID, accessToken, refreshToken, expiresAt, athleteID)
	return err
}

func (s *Store) GetStravaToken(userID int64) (*goal.StravaToken, error) {
	t := &goal.StravaToken{}
	err := s.db.QueryRow("SELECT id, user_id, access_token, refresh_token, expires_at, strava_athlete_id FROM strava_tokens WHERE user_id = ?", userID).
		Scan(&t.ID, &t.UserID, &t.AccessToken, &t.RefreshToken, &t.ExpiresAt, &t.StravaAthleteID)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (s *Store) UpdateStravaToken(t *goal.StravaToken) error {
	_, err := s.db.Exec("UPDATE strava_tokens SET access_token=?, refresh_token=?, expires_at=? WHERE user_id=?",
		t.AccessToken, t.RefreshToken, t.ExpiresAt, t.UserID)
	return err
}

func (s *Store) SaveHevyAPIKey(userID int64, apiKey string) error {
	_, err := s.db.Exec(`
		INSERT INTO hevy_tokens (user_id, api_key) VALUES (?, ?)
		ON CONFLICT(user_id) DO UPDATE SET api_key=excluded.api_key
	`, userID, apiKey)
	return err
}

func (s *Store) GetHevyAPIKey(userID int64) (string, error) {
	var key string
	err := s.db.QueryRow("SELECT api_key FROM hevy_tokens WHERE user_id = ?", userID).Scan(&key)
	return key, err
}

func (s *Store) CreateGoal(g *goal.Goal) error {
	res, err := s.db.Exec(`
		INSERT INTO goals (user_id, provider, goal_type, target_value, deadline, stake_amount, status)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, g.UserID, g.Provider, g.GoalType, g.TargetValue, g.Deadline, g.StakeAmount, g.Status)
	if err != nil {
		return err
	}
	g.ID, _ = res.LastInsertId()
	return nil
}

func (s *Store) UpdateGoalContractID(id int64, contractID int64) error {
	_, err := s.db.Exec("UPDATE goals SET contract_id = ? WHERE id = ?", contractID, id)
	return err
}

func (s *Store) UpdateGoalDeposit(id int64, stakeAmount string) error {
	_, err := s.db.Exec("UPDATE goals SET stake_amount = ?, deposited_at = unixepoch() WHERE id = ?", stakeAmount, id)
	return err
}

func (s *Store) UpdateGoalProgress(id int64, actualValue uint64) error {
	_, err := s.db.Exec("UPDATE goals SET actual_value = ? WHERE id = ?", actualValue, id)
	return err
}

func (s *Store) SettleGoal(id int64, actualValue uint64, status goal.GoalStatus) error {
	_, err := s.db.Exec("UPDATE goals SET actual_value = ?, status = ?, settled = 1 WHERE id = ?", actualValue, status, id)
	return err
}

func (s *Store) GetGoalByID(id int64) (*goal.Goal, error) {
	g := &goal.Goal{}
	var contractID sql.NullInt64
	err := s.db.QueryRow(`
		SELECT id, user_id, provider, goal_type, target_value, deadline, stake_amount,
			   actual_value, deposited_at, status, contract_id, settled, created_at
		FROM goals WHERE id = ?`, id).
		Scan(&g.ID, &g.UserID, &g.Provider, &g.GoalType, &g.TargetValue, &g.Deadline,
			&g.StakeAmount, &g.ActualValue, &g.DepositedAt, &g.Status, &contractID, &g.Settled, &g.CreatedAt)
	if err != nil {
		return nil, err
	}
	if contractID.Valid {
		g.ContractID = &contractID.Int64
	}
	return g, nil
}

func (s *Store) ListGoalsByUser(userID int64) ([]*goal.Goal, error) {
	rows, err := s.db.Query(`
		SELECT id, user_id, provider, goal_type, target_value, deadline, stake_amount,
			   actual_value, deposited_at, status, contract_id, settled, created_at
		FROM goals WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var goals []*goal.Goal
	for rows.Next() {
		g := &goal.Goal{}
		var contractID sql.NullInt64
		if err := rows.Scan(&g.ID, &g.UserID, &g.Provider, &g.GoalType, &g.TargetValue, &g.Deadline,
			&g.StakeAmount, &g.ActualValue, &g.DepositedAt, &g.Status, &contractID, &g.Settled, &g.CreatedAt); err != nil {
			return nil, err
		}
		if contractID.Valid {
			g.ContractID = &contractID.Int64
		}
		goals = append(goals, g)
	}
	return goals, nil
}

func (s *Store) GetOrCreateChallengeStart(challengeID, userID int64, contractAddress string) (int64, error) {
	var startTime int64
	err := s.db.QueryRow("SELECT start_time FROM challenge_sync_state WHERE challenge_id = ? AND contract_address = ?", challengeID, contractAddress).Scan(&startTime)
	if err == sql.ErrNoRows {
		startTime = time.Now().Unix() - 7200
		_, err = s.db.Exec("INSERT INTO challenge_sync_state (challenge_id, contract_address, user_id, start_time) VALUES (?, ?, ?, ?)",
			challengeID, contractAddress, userID, startTime)
		if err != nil {
			return 0, err
		}
	}
	return startTime, nil
}
