# NazarETH

**Stake on yourself. Earn while you grind.**

An onchain fitness commitment protocol where athletes stake USDC against verifiable fitness goals — hit your target to earn back, miss it and lose the unearned portion. Built on Base.

> **Competition**: Base Batches 003 — Student Track

## What It Does

NazarETH bridges the gap between ambition and action by adding real financial accountability to fitness goals:

1. **Connect** your wallet and Strava account
2. **Create a challenge** — pick an activity (running, cycling, swimming), set a distance target, duration, and stake amount
3. **Deposit USDC** — locked in the smart contract while you train
4. **Sync progress** — backend fetches Strava activities, oracle submits verified progress on-chain
5. **Withdraw milestones** — claim 10% of your stake back for every 10% of progress earned
6. **Finalize** — after deadline, unearned stake goes to treasury/community pool

### Key Features

- **Strava integration** — OAuth 2.0 + real-time activity syncing via GPX uploads
- **Simulate Run** — interactive map drawer to simulate GPS runs for demo purposes
- **Milestone withdrawals** — withdraw progress incrementally, not just at the end
- **Sybil protection** — 1:1 wallet-to-Strava binding via EIP-712 signatures
- **Oracle-verified progress** — backend signs and submits on-chain, contract validates oracle role
- **MockUSDC faucet** — built-in testnet token with permissionless minting

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│    Backend    │────▶│   Smart Contracts │
│  React+wagmi │     │   Golang      │     │   Solidity 0.8.26│
│   :5173      │     │   :8080       │     │   Base Sepolia   │
└─────────────┘     └──────┬───────┘     └──────────────────┘
                           │
                    ┌──────┴───────┐
                    │  Strava API  │
                    └──────────────┘
```

### Smart Contracts (6 contracts)

| Contract | Purpose |
|----------|---------|
| **MockUSDC** | Testnet USDC with permissionless `mint()` |
| **NazarRegistry** | 1:1 wallet ↔ Strava binding (EIP-712 + devRegister) |
| **NazarOracle** | Receives progress submissions from oracle backend |
| **NazarChallenge** | Challenge lifecycle: create → deposit → withdraw → finalize |
| **NazarTreasury** | Receives slashed funds from failed challenges |
| **MockMorpho** | Yield vault with 5% APY accrual (pluggable Morpho/Aave layer) |

### Backend (Golang)

- REST API with JWT auth (SIWE-based)
- Strava OAuth 2.0 provider with token refresh
- Oracle client: submits `submitProgress()` txs on-chain with EIP-155 signing
- Registry EIP-712 signature generation for on-chain registration
- GPX generation + Strava activity upload for simulated runs
- SQLite store for users, goals, and OAuth tokens

### Frontend (React + TypeScript)

- wagmi v2 + viem for wallet and contract interactions
- Interactive OpenStreetMap with route drawing (Leaflet)
- 6 pages: Dashboard, Register, New Challenge, Active Challenge, Simulate Run, History
- MockUSDC faucet built into Dashboard

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Go](https://go.dev/) 1.22+
- [Foundry](https://book.getfoundry.sh/) (for contracts)
- [MetaMask](https://metamask.io/) with Base Sepolia configured

### 1. Configure Environment

```bash
cp .env.example .env
# Fill in Strava credentials and signer key (see .env.example for instructions)
```

### 2. Start Backend

```bash
cd backend
source ../.env && export STRAVA_CLIENT_ID STRAVA_CLIENT_SECRET STRAVA_REDIRECT_URI \
  JWT_SECRET BACKEND_SIGNER_PRIVATE_KEY BACKEND_SIGNER_ADDRESS BASE_SEPOLIA_RPC_URL \
  NAZAR_MOCKUSDC_ADDRESS NAZAR_REGISTRY_ADDRESS NAZAR_ORACLE_ADDRESS \
  NAZAR_YIELD_ADDRESS NAZAR_TREASURY_ADDRESS NAZAR_CHALLENGE_ADDRESS && \
  go run ./cmd/server/
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### 4. Get Testnet Funds

Get Base Sepolia ETH from the [CDP Faucet](https://portal.cdp.coinbase.com/products/faucet). MockUSDC can be minted directly from the Dashboard.

## Deployed Contracts (Base Sepolia)

| Contract | Address |
|----------|---------|
| MockUSDC | `0x174aA8946271A986FdE7cFEd2cc9d1b27d827Cc3` |
| NazarRegistry | `0x3E3e9CBF18Cca0341D174078A71546Bafe7c1D25` |
| NazarOracle | `0x44def09596B86eb2A41B61BfcA737E038cdd24F7` |
| MockMorpho | `0x30Ae9eA7bc8548A67F055793B5399d749573fB09` |
| NazarTreasury | `0xf7Cb4524AB940FF719d2b2E4584A094Cb9CB3213` |
| NazarChallenge | `0xab1FacE87567959eed4E42842A0f14209Be5C671` |

Admin/Oracle deployer: `0x40C3DD9a3aA86206655F14115897227f302C8B8A`

## Demo Flow

1. **Dashboard** → Connect wallet → Mint 1,000 USDC
2. **Register** → Connect with Strava (OAuth) or devRegister
3. **New Challenge** → Pick Running, 10,000m, 3 min, 10 USDC → Approve → Create
4. **My Challenge** → Approve + Deposit USDC → Active
5. **Simulate Run** → Draw a route on the map (or pick a preset) → Upload to Strava
6. **My Challenge** → Sync from Strava → Oracle submits progress on-chain
7. **Withdraw Milestones** → Claim earned portions of your stake
8. **Finalize** → After deadline + grace period, remaining funds distributed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.26, Foundry, OpenZeppelin |
| Backend | Go 1.22, net/http, go-ethereum, SQLite |
| Frontend | React 18, TypeScript, Vite, wagmi v2, viem, Leaflet |
| Blockchain | Base (Sepolia testnet), EIP-712, EIP-155 |
| External APIs | Strava OAuth 2.0, Strava Activities API, Strava Uploads API |

## Project Structure

```
NazarETH/
├── contracts/           # Foundry project
│   ├── src/            # Solidity source (6 contracts)
│   ├── test/           # Foundry tests (49/50 passing)
│   └── script/         # Deploy scripts (local + Base Sepolia)
├── backend/            # Go backend
│   ├── cmd/server/     # Entry point + routing
│   └── internal/       # API, auth, oracle, providers, store, config
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/      # 7 page components
│       ├── components/ # Layout, ConnectWallet
│       └── lib/        # wagmi config, contract ABIs, addresses
├── .env.example        # Environment template
└── BRAINSTORM.md       # Full product plan & architecture
```

## License

MIT
