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
	FrontendURL         string
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
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),
		HevyAPIKey:         getEnv("HEVY_API_KEY", ""),
		SignerPrivateKey:   getEnv("BACKEND_SIGNER_PRIVATE_KEY", ""),
		SignerAddress:      getEnv("BACKEND_SIGNER_ADDRESS", ""),
		RPCURL:             getEnv("BASE_SEPOLIA_RPC_URL", "https://sepolia.base.org"),
		OracleAddress:      getEnv("NAZAR_ORACLE_ADDRESS", "0xEc6340c09531BfFC9D53348Abf58598D4A0f2156"),
		RegistryAddress:    getEnv("NAZAR_REGISTRY_ADDRESS", "0xE3f97d85e2f1aEDcCE7D010A051d5b403c5a4583"),
		ChallengeAddress:   getEnv("NAZAR_CHALLENGE_ADDRESS", "0x5e37c9da0083fF21559aC75EdE54ced1E8a3C94e"),
		MockUSDCAddress:    getEnv("NAZAR_MOCKUSDC_ADDRESS", "0xcEf88f18f5Cc53f8c0722FC370400D3dF023BA68"),
		TreasuryAddress:    getEnv("NAZAR_TREASURY_ADDRESS", "0x4eDCa9b2Bd1601f527FA87656802a51d5390BA4C"),
		YieldAddress:       getEnv("NAZAR_YIELD_ADDRESS", "0xb8D3fBaFeA79Bc8c151ff058b9d24776099Da4Fa"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
