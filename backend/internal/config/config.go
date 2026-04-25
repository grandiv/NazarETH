package config

import (
	"os"
)

type Config struct {
	Port                string
	DatabasePath        string
	JWTSecret           string
	StravaClientID      string
	StravaClientSecret  string
	StravaRedirectURI   string
	HevyAPIKey          string
	SignerPrivateKey    string
	SignerAddress       string
	GoalVaultAddress    string
	USDCContractAddress string
	RPCURL              string
}

func Load() *Config {
	return &Config{
		Port:                getEnv("PORT", "8080"),
		DatabasePath:        getEnv("DATABASE_PATH", "./data/nazareth.db"),
		JWTSecret:           getEnv("JWT_SECRET", ""),
		StravaClientID:      getEnv("STRAVA_CLIENT_ID", ""),
		StravaClientSecret:  getEnv("STRAVA_CLIENT_SECRET", ""),
		StravaRedirectURI:   getEnv("STAVA_REDIRECT_URI", "http://localhost:8080/auth/strava/callback"),
		HevyAPIKey:          getEnv("HEVY_API_KEY", ""),
		SignerPrivateKey:    getEnv("BACKEND_SIGNER_PRIVATE_KEY", ""),
		SignerAddress:       getEnv("BACKEND_SIGNER_ADDRESS", ""),
		GoalVaultAddress:    getEnv("GOAL_VAULT_ADDRESS", ""),
		USDCContractAddress: getEnv("USDC_CONTRACT_ADDRESS", "0x036CbD53842c5426634e7929541eC2318f3dCF7e"),
		RPCURL:              getEnv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
