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
	RPCURL              string
	OracleAddress       string
	RegistryAddress     string
	ChallengeAddress    string
	MockUSDCAddress     string
	TreasuryAddress     string
	YieldAddress        string
}

func Load() *Config {
	return &Config{
		Port:               getEnv("PORT", "8080"),
		DatabasePath:       getEnv("DATABASE_PATH", "./data/nazareth.db"),
		JWTSecret:          getEnv("JWT_SECRET", ""),
		StravaClientID:     getEnv("STRAVA_CLIENT_ID", ""),
		StravaClientSecret: getEnv("STRAVA_CLIENT_SECRET", ""),
		StravaRedirectURI:  getEnv("STRAVA_REDIRECT_URI", "http://localhost:8080/auth/strava/callback"),
		HevyAPIKey:         getEnv("HEVY_API_KEY", ""),
		SignerPrivateKey:   getEnv("BACKEND_SIGNER_PRIVATE_KEY", ""),
		SignerAddress:      getEnv("BACKEND_SIGNER_ADDRESS", ""),
		RPCURL:             getEnv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
		OracleAddress:      getEnv("NAZAR_ORACLE_ADDRESS", "0x30D282C7bd12467714Bb922C62f712bC4FC0002f"),
		RegistryAddress:    getEnv("NAZAR_REGISTRY_ADDRESS", "0x811a837bdaa8D27967Db87af87C54291B33B6bae"),
		ChallengeAddress:   getEnv("NAZAR_CHALLENGE_ADDRESS", "0x0c1D52dAe67E3136729Ccb26a4ba64648f5eCFda"),
		MockUSDCAddress:    getEnv("NAZAR_MOCKUSDC_ADDRESS", "0x6118c512a606d55d2b466727e8f26E60233860dd"),
		TreasuryAddress:    getEnv("NAZAR_TREASURY_ADDRESS", "0x1CFA02Ab6649a679435cB9C1CafbEA6CE0F92e66"),
		YieldAddress:       getEnv("NAZAR_YIELD_ADDRESS", "0x7b5d6f5ff516F1d7d6EF0E9DD9cfBA79A5e8f12d"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
