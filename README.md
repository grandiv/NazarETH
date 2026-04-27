# NazarETH

**Stake on yourself. Earn while you grind.**

An onchain fitness commitment protocol where athletes stake USDC against verifiable fitness goals — hit your target to earn back, miss it and lose the unearned portion. Built on Base.

> **Competition**: Base Batches 003 — Student Track

---

## Step-by-Step Demo Tutorial

> Follow these steps to test the full E2E flow in ~5 minutes. You need MetaMask with Base Sepolia configured.

### Step 1: Setup MetaMask

1. Open MetaMask → Add Network → Add a network manually
2. Fill in:
   - **Network name**: Base Sepolia
   - **RPC URL**: `https://sepolia.base.org`
   - **Chain ID**: `84532`
   - **Currency symbol**: ETH
   - **Block explorer**: `https://sepolia.basescan.org`
3. Get free testnet ETH from [Coinbase Faucet](https://portal.cdp.coinbase.com/products/faucet)
4. Open **http://localhost:5173** (or the deployed URL)

### Step 2: Connect & Get USDC

1. Click **Connect Wallet** in the top-right → select MetaMask
2. On the Dashboard, click **"Get 1,000 USDC"** → confirm in MetaMask
3. Wait for the tx to confirm — your USDC balance will update

### Step 3: Register

1. Go to **Register** page
2. Option A (recommended): Click **"Connect with Strava"** — authorizes real Strava access
3. Option B (quick): Click **"devRegister"** — enter any number (e.g. `12345`) and confirm
4. You should see "Registered!" confirmation

### Step 4: Create a Challenge

1. Go to **New Challenge** page
2. Pick a preset (e.g. "Quick 3K") or set custom values:
   - Target: 3 km
   - Duration: 5 minutes
   - Stake: 5 USDC
3. Click **"1. Approve 5 USDC"** → confirm in MetaMask
4. After approval, click **"2. Create Challenge"** → confirm in MetaMask

### Step 5: Deposit USDC

1. Go to **My Challenge** page
2. You'll see "Deposit Required" — click **Approve** then **Deposit** → confirm both in MetaMask
3. Challenge status changes from "Created" to "Active"

### Step 6: Simulate a Run

1. Go to **Simulate Run** page
2. Click a preset (e.g. "Central Park Loop 10K") or draw your own route on the map
3. Click **"Upload to Strava"** → this creates a real GPS activity in Strava
4. Wait for "Activity uploaded!" confirmation

### Step 7: Sync Progress

1. Go back to **My Challenge** page
2. Click **"Sync from Strava"**
3. The backend fetches your Strava activities, calculates distance, and submits progress to the on-chain oracle
4. You'll see the progress bar update with your distance and milestone milestones earned

### Step 8: Withdraw Milestones

1. After syncing, if progress >= 10%, a **"Milestone Unlocked!"** card appears
2. Click **"Withdraw Milestone"** → confirm in MetaMask
3. You receive 10% of your staked USDC back for each 10% of progress
4. Repeat sync + withdraw as needed

### Step 9: Finalize

1. After the deadline + 2 min grace period, a **"Finalize Challenge"** button appears
2. Click it → remaining unearned stake is split: 15% treasury / 85% completion pool
3. Challenge status changes to "Finalized"

### Bonus: Territory Map

1. Go to **Territory** page to see a grid-based map of all blocks you've explored through your runs
2. Green cells = claimed territory. Brighter = visited more times.

### Bonus: History

1. Go to **History** page to see all your challenges with progress bars, route maps, and financial stats

---

## What It Does

NazarETH bridges the gap between ambition and action by adding real financial accountability to fitness goals:

1. **Connect** your wallet and Strava account
2. **Create a challenge** — set a distance target, duration, and stake amount
3. **Deposit USDC** — locked in the smart contract while you train
4. **Sync progress** — backend fetches Strava activities, oracle submits verified progress on-chain
5. **Withdraw milestones** — claim 10% of your stake back for every 10% of progress earned
6. **Finalize** — after deadline, unearned stake goes to treasury/community pool

### Key Features

- **Strava integration** — OAuth 2.0 + real-time activity syncing via GPX uploads
- **Simulate Run** — interactive map drawer to simulate GPS runs for demo purposes
- **Territory map** — grid-based land claim gamification, explore more blocks by running more
- **Milestone withdrawals** — withdraw progress incrementally, not just at the end
- **Sybil protection** — 1:1 wallet-to-Strava binding via EIP-712 signatures
- **Oracle-verified progress** — backend signs and submits on-chain, contract validates oracle role
- **MockMorpho yield** — staked funds accrue 5% APY while locked in the yield vault
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
- Territory map with grid-based land claim visualization
- 8 pages: Dashboard, Register, New Challenge, My Challenge, Simulate Run, Territory, History, Oracle

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Go](https://go.dev/) 1.22+
- [MetaMask](https://metamask.io/) with Base Sepolia configured

### 1. Start Backend

```bash
cd backend
source ../.env && export STRAVA_CLIENT_ID STRAVA_CLIENT_SECRET STRAVA_REDIRECT_URI \
  JWT_SECRET BACKEND_SIGNER_PRIVATE_KEY BACKEND_SIGNER_ADDRESS BASE_SEPOLIA_RPC_URL \
  NAZAR_MOCKUSDC_ADDRESS NAZAR_REGISTRY_ADDRESS NAZAR_ORACLE_ADDRESS \
  NAZAR_YIELD_ADDRESS NAZAR_TREASURY_ADDRESS NAZAR_CHALLENGE_ADDRESS && \
  go run ./cmd/server/
```

### 2. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

### 3. Get Testnet Funds

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
│   ├── src/            # Solidity source (7 contracts)
│   ├── test/           # Foundry tests
│   └── script/         # Deploy scripts (local + Base Sepolia)
├── backend/            # Go backend
│   ├── cmd/server/     # Entry point + routing
│   └── internal/       # API, auth, oracle, providers, store, config
├── frontend/           # React + Vite
│   └── src/
│       ├── pages/      # 8 page components
│       ├── components/ # Layout, ConnectWallet
│       └── lib/        # wagmi config, contract ABIs, addresses
├── .env.example        # Environment template
└── BRAINSTORM.md       # Full product plan & architecture
```

## License

MIT
