package auth

import (
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"

	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type SIWEMessage struct {
	Domain     string
	Address    string
	Statement  string
	URI        string
	Version    string
	ChainID    int64
	Nonce      string
	IssuedAt   string
	Expiration string
}

func ParseSIWEMessage(msg string) (*SIWEMessage, error) {
	m := &SIWEMessage{}
	lines := strings.Split(msg, "\n")
	for _, line := range lines {
		parts := strings.SplitN(line, ": ", 2)
		if len(parts) != 2 {
			continue
		}
		switch parts[0] {
		case m.Domain:
		case "Domain":
			m.Domain = parts[1]
		case "Address":
			m.Address = parts[1]
		case "Statement":
			m.Statement = parts[1]
		case "URI":
			m.URI = parts[1]
		case "Version":
			m.Version = parts[1]
		case "Chain ID":
			fmt.Sscanf(parts[1], "%d", &m.ChainID)
		case "Nonce":
			m.Nonce = parts[1]
		case "Issued At":
			m.IssuedAt = parts[1]
		case "Expiration Time":
			m.Expiration = parts[1]
		}
	}
	if m.Address == "" {
		return nil, fmt.Errorf("missing address in SIWE message")
	}
	return m, nil
}

func VerifySIWESignature(message string, signatureHex string) (common.Address, error) {
	sigBytes, err := hex.DecodeString(strings.TrimPrefix(signatureHex, "0x"))
	if err != nil {
		return common.Address{}, fmt.Errorf("decode signature: %w", err)
	}
	if len(sigBytes) < 65 {
		return common.Address{}, fmt.Errorf("signature too short")
	}

	sigBytes[len(sigBytes)-1] -= 27

	msgHash := crypto.Keccak256Hash(
		[]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)),
	)

	pubKey, err := crypto.SigToPub(msgHash.Bytes(), sigBytes)
	if err != nil {
		return common.Address{}, fmt.Errorf("recover pubkey: %w", err)
	}

	if !ValidatePublicKey(pubKey, common.HexToAddress(ParseSIWEMessageSimple(message))) {
		return common.Address{}, fmt.Errorf("signature does not match address")
	}

	return crypto.PubkeyToAddress(*pubKey), nil
}

func ParseSIWEMessageSimple(msg string) string {
	lines := strings.Split(msg, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "0x") && len(line) == 42 {
			return line
		}
	}
	return ""
}

func ValidatePublicKey(pubKey *ecdsa.PublicKey, expected common.Address) bool {
	return crypto.PubkeyToAddress(*pubKey) == expected
}
