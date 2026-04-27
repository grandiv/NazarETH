package oracle

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"
	"strings"
	"sync"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

type OracleClient struct {
	client        *ethclient.Client
	privateKey    *ecdsa.PrivateKey
	chainID       *big.Int
	oracleAddr    common.Address
	registryAddr  common.Address
	challengeAddr common.Address
	nonceMu       sync.Mutex
}

func New(rpcURL, privateKeyHex, oracleAddr, registryAddr, challengeAddr string, chainID int64) (*OracleClient, error) {
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, fmt.Errorf("dial rpc: %w", err)
	}

	pk, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}

	return &OracleClient{
		client:        client,
		privateKey:    pk,
		chainID:       big.NewInt(chainID),
		oracleAddr:    common.HexToAddress(oracleAddr),
		registryAddr:  common.HexToAddress(registryAddr),
		challengeAddr: common.HexToAddress(challengeAddr),
	}, nil
}

func (o *OracleClient) Address() common.Address {
	return crypto.PubkeyToAddress(o.privateKey.PublicKey)
}

func (o *OracleClient) authTx(ctx context.Context) (*bind.TransactOpts, error) {
	o.nonceMu.Lock()
	defer o.nonceMu.Unlock()

	nonce, err := o.client.PendingNonceAt(ctx, o.Address())
	if err != nil {
		return nil, fmt.Errorf("get nonce: %w", err)
	}

	gasPrice, err := o.client.SuggestGasPrice(ctx)
	if err != nil {
		return nil, fmt.Errorf("suggest gas: %w", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(o.privateKey, o.chainID)
	if err != nil {
		return nil, fmt.Errorf("create auth: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.GasPrice = gasPrice
	auth.GasLimit = 200000
	auth.Context = ctx
	return auth, nil
}

func (o *OracleClient) SubmitProgress(ctx context.Context, wallet common.Address, challengeID uint64, progressBps uint64, reportedAt uint64) (common.Hash, error) {
	oracleABI, err := o.parseOracleABI()
	if err != nil {
		return common.Hash{}, err
	}

	calldata, err := oracleABI.Pack("submitProgress", wallet, new(big.Int).SetUint64(challengeID), new(big.Int).SetUint64(progressBps), new(big.Int).SetUint64(reportedAt))
	if err != nil {
		return common.Hash{}, fmt.Errorf("pack: %w", err)
	}

	return o.sendTx(ctx, calldata)
}

func (o *OracleClient) FinalizeProgress(ctx context.Context, wallet common.Address, challengeID uint64) (common.Hash, error) {
	oracleABI, err := o.parseOracleABI()
	if err != nil {
		return common.Hash{}, err
	}

	calldata, err := oracleABI.Pack("finalizeProgress", wallet, new(big.Int).SetUint64(challengeID))
	if err != nil {
		return common.Hash{}, fmt.Errorf("pack: %w", err)
	}

	return o.sendTx(ctx, calldata)
}

func (o *OracleClient) SignRegistryRegistration(wallet common.Address, stravaAthleteID uint64, nonce uint64, deadline uint64) ([]byte, error) {
	registerTypeHash := crypto.Keccak256Hash([]byte("Register(address wallet,uint256 stravaAthleteId,uint256 nonce,uint256 deadline)"))

	domainSeparator, err := o.hashRegistryDomain()
	if err != nil {
		return nil, err
	}

	structHash := crypto.Keccak256(
		registerTypeHash[:],
		common.LeftPadBytes(wallet.Bytes(), 32),
		common.LeftPadBytes(new(big.Int).SetUint64(stravaAthleteID).Bytes(), 32),
		common.LeftPadBytes(new(big.Int).SetUint64(nonce).Bytes(), 32),
		common.LeftPadBytes(new(big.Int).SetUint64(deadline).Bytes(), 32),
	)

	digest := crypto.Keccak256(
		[]byte{0x19, 0x01},
		domainSeparator,
		structHash,
	)

	sig, err := crypto.Sign(digest, o.privateKey)
	if err != nil {
		return nil, fmt.Errorf("sign: %w", err)
	}
	sig[64] += 27
	return sig, nil
}

func (o *OracleClient) hashRegistryDomain() ([]byte, error) {
	typeHash := crypto.Keccak256([]byte("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"))
	nameHash := crypto.Keccak256Hash([]byte("NazarRegistry"))
	versionHash := crypto.Keccak256Hash([]byte("1"))

	return crypto.Keccak256(
		typeHash,
		nameHash[:],
		versionHash[:],
		common.LeftPadBytes(o.chainID.Bytes(), 32),
		common.LeftPadBytes(o.registryAddr.Bytes(), 32),
	), nil
}

func (o *OracleClient) sendTx(ctx context.Context, calldata []byte) (common.Hash, error) {
	auth, err := o.authTx(ctx)
	if err != nil {
		return common.Hash{}, err
	}

	gasEstimate := ethereum.CallMsg{
		From: o.Address(),
		To:   &o.oracleAddr,
		Data: calldata,
	}
	gas, err := o.client.EstimateGas(ctx, gasEstimate)
	if err != nil {
		return common.Hash{}, fmt.Errorf("estimate gas: %w", err)
	}
	gasLimit := gas + 10000

	unsignedTx := types.NewTransaction(auth.Nonce.Uint64(), o.oracleAddr, big.NewInt(0), gasLimit, auth.GasPrice, calldata)
	signedTx, err := types.SignTx(unsignedTx, types.NewEIP155Signer(o.chainID), o.privateKey)
	if err != nil {
		return common.Hash{}, fmt.Errorf("sign tx: %w", err)
	}
	if err := o.client.SendTransaction(ctx, signedTx); err != nil {
		return common.Hash{}, fmt.Errorf("send tx: %w", err)
	}
	return signedTx.Hash(), nil
}

func (o *OracleClient) parseOracleABI() (*abi.ABI, error) {
	oracleABIJSON := `[{"inputs":[{"name":"wallet","type":"address"},{"name":"challengeId","type":"uint256"},{"name":"progressBps","type":"uint256"},{"name":"reportedAt","type":"uint256"}],"name":"submitProgress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"wallet","type":"address"},{"name":"challengeId","type":"uint256"}],"name":"finalizeProgress","outputs":[],"stateMutability":"nonpayable","type":"function"}]`

	parsed, err := abi.JSON(strings.NewReader(oracleABIJSON))
	if err != nil {
		return nil, fmt.Errorf("parse abi: %w", err)
	}
	return &parsed, nil
}

func (o *OracleClient) GetChallengeTarget(ctx context.Context, challengeID uint64) (uint64, error) {
	parsed, err := abi.JSON(strings.NewReader(`[{"inputs":[{"name":"","type":"uint256"}],"name":"getChallenge","outputs":[{"name":"challenger","type":"address"},{"name":"activityType","type":"bytes32"},{"name":"targetValue","type":"uint256"},{"name":"deadline","type":"uint256"},{"name":"stakeAmount","type":"uint256"},{"name":"status","type":"uint8"},{"name":"withdrawnBps","type":"uint256"}],"stateMutability":"view","type":"function"}]`))
	if err != nil {
		return 0, fmt.Errorf("parse challenge abi: %w", err)
	}

	calldata, err := parsed.Pack("getChallenge", new(big.Int).SetUint64(challengeID))
	if err != nil {
		return 0, fmt.Errorf("pack: %w", err)
	}

	result, err := o.client.CallContract(ctx, ethereum.CallMsg{
		To:   &o.challengeAddr,
		Data: calldata,
	}, nil)
	if err != nil {
		return 0, fmt.Errorf("call getChallenge: %w", err)
	}

	if len(result) < 3*32 {
		return 0, fmt.Errorf("getChallenge returned %d bytes, need at least 96", len(result))
	}

	targetValue := new(big.Int).SetBytes(result[2*32 : 3*32])
	return targetValue.Uint64(), nil
}

func (o *OracleClient) GetChallengeDeadline(ctx context.Context, challengeID uint64) (uint64, error) {
	parsed, err := abi.JSON(strings.NewReader(`[{"inputs":[{"name":"","type":"uint256"}],"name":"getChallenge","outputs":[{"name":"challenger","type":"address"},{"name":"activityType","type":"bytes32"},{"name":"targetValue","type":"uint256"},{"name":"deadline","type":"uint256"},{"name":"stakeAmount","type":"uint256"},{"name":"status","type":"uint8"},{"name":"withdrawnBps","type":"uint256"}],"stateMutability":"view","type":"function"}]`))
	if err != nil {
		return 0, fmt.Errorf("parse abi: %w", err)
	}
	calldata, err := parsed.Pack("getChallenge", new(big.Int).SetUint64(challengeID))
	if err != nil {
		return 0, fmt.Errorf("pack: %w", err)
	}
	result, err := o.client.CallContract(ctx, ethereum.CallMsg{
		To:   &o.challengeAddr,
		Data: calldata,
	}, nil)
	if err != nil {
		return 0, fmt.Errorf("call: %w", err)
	}
	if len(result) < 4*32 {
		return 0, fmt.Errorf("short response: %d bytes", len(result))
	}
	deadline := new(big.Int).SetBytes(result[3*32 : 4*32])
	return deadline.Uint64(), nil
}
