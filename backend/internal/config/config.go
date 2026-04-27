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
		OracleAddress:      getEnv("NAZAR_ORACLE_ADDRESS", "0xb7592f34b512092857A785329E1a3aEeBC728ca8"),
		RegistryAddress:    getEnv("NAZAR_REGISTRY_ADDRESS", "0xe5F730645870d573A9a9B9a0133d6cE7aA8bD089"),
		ChallengeAddress:   getEnv("NAZAR_CHALLENGE_ADDRESS", "0xbF4551c7D4Ec55ecb893c93846dEF76bA6ab655E"),
		MockUSDCAddress:    getEnv("NAZAR_MOCKUSDC_ADDRESS", "0x088B58BCdD68E3411f36170A105658bd1014c6a6"),
		TreasuryAddress:    getEnv("NAZAR_TREASURY_ADDRESS", "0x884609eeBfb89f3Edb8CB06b751aAEdE48618eE3"),
		YieldAddress:       getEnv("NAZAR_YIELD_ADDRESS", "0x0F69f8e2dAb38714b6e52E8BA0d922D084512886"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
