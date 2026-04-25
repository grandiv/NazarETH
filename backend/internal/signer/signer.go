package signer

import (
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"
)

type EIP712Signer struct {
	privateKey       *ecdsa.PrivateKey
	domainSeparator  []byte
	domain           apitypes.TypedDataDomain
	settlementType   string
	settlementHash   [32]byte
}

func New(privateKeyHex, contractAddress string, chainID int64) (*EIP712Signer, error) {
	pk, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	domain := apitypes.TypedDataDomain{
		Name:              "NazarETH GoalVault",
		Version:           "1",
		ChainId:           math.NewHexOrDecimal256(chainID),
		VerifyingContract: contractAddress,
	}

	domainSeparator, err := hashDomain(domain)
	if err != nil {
		return nil, fmt.Errorf("hash domain: %w", err)
	}

	settlementType := "Settlement(uint256 goalId,uint256 actualValue,uint256 timestamp)"
	settlementHash := crypto.Keccak256Hash([]byte(settlementType))

	return &EIP712Signer{
		privateKey:      pk,
		domainSeparator: domainSeparator,
		domain:          domain,
		settlementType:  settlementType,
		settlementHash:  settlementHash,
	}, nil
}

func (s *EIP712Signer) Address() common.Address {
	return crypto.PubkeyToAddress(s.privateKey.PublicKey)
}

func (s *EIP712Signer) SignSettlement(goalID, actualValue, timestamp uint64) ([]byte, error) {
	structHash := crypto.Keccak256(
		s.settlementHash[:],
		common.LeftPadBytes(new(big.Int).SetUint64(goalID).Bytes(), 32),
		common.LeftPadBytes(new(big.Int).SetUint64(actualValue).Bytes(), 32),
		common.LeftPadBytes(new(big.Int).SetUint64(timestamp).Bytes(), 32),
	)

	digest := crypto.Keccak256(
		[]byte{0x19, 0x01},
		s.domainSeparator,
		structHash,
	)

	sig, err := crypto.Sign(digest, s.privateKey)
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}
	sig[64] += 27
	return sig, nil
}

func hashDomain(domain apitypes.TypedDataDomain) ([]byte, error) {
	typeHash := crypto.Keccak256([]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))

	var nameHash [32]byte
	if domain.Name != "" {
		nameHash = crypto.Keccak256Hash([]byte(domain.Name))
	}

	var versionHash [32]byte
	if domain.Version != "" {
		versionHash = crypto.Keccak256Hash([]byte(domain.Version))
	}

	var chainID *big.Int
	if domain.ChainId != nil {
		chainID = (*big.Int)(domain.ChainId)
	}

	var verifyingContract common.Address
	if domain.VerifyingContract != "" {
		verifyingContract = common.HexToAddress(domain.VerifyingContract)
	}

	return crypto.Keccak256(
		typeHash,
		nameHash[:],
		versionHash[:],
		common.LeftPadBytes(chainID.Bytes(), 32),
		common.LeftPadBytes(verifyingContract.Bytes(), 32),
	), nil
}
