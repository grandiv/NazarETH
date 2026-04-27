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
		OracleAddress:      getEnv("NAZAR_ORACLE_ADDRESS", "0x44def09596B86eb2A41B61BfcA737E038cdd24F7"),
		RegistryAddress:    getEnv("NAZAR_REGISTRY_ADDRESS", "0x3E3e9CBF18Cca0341D174078A71546Bafe7c1D25"),
		ChallengeAddress:   getEnv("NAZAR_CHALLENGE_ADDRESS", "0xab1FacE87567959eed4E42842A0f14209Be5C671"),
		MockUSDCAddress:    getEnv("NAZAR_MOCKUSDC_ADDRESS", "0x174aA8946271A986FdE7cFEd2cc9d1b27d827Cc3"),
		TreasuryAddress:    getEnv("NAZAR_TREASURY_ADDRESS", "0xf7Cb4524AB940FF719d2b2E4584A094Cb9CB3213"),
		YieldAddress:       getEnv("NAZAR_YIELD_ADDRESS", "0x30Ae9eA7bc8548A67F055793B5399d749573fB09"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
