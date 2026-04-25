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
		OracleAddress:      getEnv("NAZAR_ORACLE_ADDRESS", "0xf3A7a178C94152a8ad3eCcBc859DdcEf39763eBB"),
		RegistryAddress:    getEnv("NAZAR_REGISTRY_ADDRESS", "0x04a340843af2e6b98D6C73a34195D715954e6F8C"),
		ChallengeAddress:   getEnv("NAZAR_CHALLENGE_ADDRESS", "0xB7dF500fec819efD7FC6F544C6A9B760d1cdEC2a"),
		MockUSDCAddress:    getEnv("NAZAR_MOCKUSDC_ADDRESS", "0x7E450bbceD79824BDb019a39D4147288159CA405"),
		TreasuryAddress:    getEnv("NAZAR_TREASURY_ADDRESS", "0xAD2c206C02107D594B3B337Ce10950c14986205c"),
		YieldAddress:       getEnv("NAZAR_YIELD_ADDRESS", "0xa68aE383B23D31730C0c5D1F8E2d869406f01CB3"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
