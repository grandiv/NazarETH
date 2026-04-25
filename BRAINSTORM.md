# NazarETH — Brainstorm & Execution Plan

> **Competition**: Base Batches 003: Student Track | **Deadline**: April 27, 2026
> **Track**: Consumer App + DeFi | **Chain**: Base (Ethereum L2)

---

## 1. Product Vision

**Tagline**: *"Stake on yourself. Earn while you grind."*

**Name candidates**: NazarETH, Stride, CommitFi, StakeFit, Grind

**One-liner**: An onchain commitment protocol where athletes stake USDC against verifiable fitness goals — earn yield while you train, lose if you quit.

**What it is NOT**: A gamified fitness app. A gambling platform. A punishment app. A running-only app.

**What it IS**: A behavioral motivation engine powered by real financial consequences and rewards. A **multi-provider fitness commitment platform** — not just running (Strava), but gym consistency too (Hevy). The crypto equivalent of betting on yourself — except your money earns yield via Morpho while you work toward your goal.

### Provider Strategy

| Provider | Goal Type | Verification | Auth | User Base |
|---|---|---|---|---|
| **Strava** | Distance-based (run X km in Y days) | GPS + pace + duration | OAuth 2.0 | 100M+ athletes |
| **Hevy** | Consistency-based (complete N workouts in Y days) | Workout count + timestamp | API key | Gym-focused, Pro users |

**Why both?**
1. **Doubles addressable market** — Not everyone runs. Gym-goers are a massive, motivated demographic.
2. **Platform story** — We're not "a running app," we're "a commitment protocol for any verifiable fitness activity." Judges love platform thinking.
3. **Mitigates Strava dependency** — If Strava cuts access, Hevy keeps the product alive.
4. **Minimal extra effort** — Hevy uses simple API key auth (no OAuth flow), and goals are just workout counts (no GPS math). Backend provider abstraction handles both.

---

## 2. Core Concept & Mechanism

### The Problem
- 73% of people who set fitness goals abandon them (Strava data)
- The gap between intention and action is consequence, not desire
- Existing apps rely on badges and streaks — weak psychological anchors
- No platform combines verifiable real-world activity with onchain financial stakes
- Running apps ignore gym-goers; gym apps ignore runners — no unified commitment platform

### The Solution: Goal Staking Protocol

```
User picks provider → Creates goal → Deposits USDC → Funds earn yield (Morpho) → 
Provider tracks progress → Goal achieved? → Deposit + yield returned / Slashed
```

### Goal Types

| Provider | Goal Type | Metric | Example | Slashing Basis |
|---|---|---|---|---|
| **Strava** | Distance | meters covered | "Run 10 km this week" | % of target distance |
| **Strava** | Frequency | run count | "Run 3 times this week" | % of target count |
| **Hevy** | Consistency | workout count | "Complete 4 gym sessions in 2 weeks" | % of target count |
| **Hevy** | Volume | total sets or duration | "Log 50 total sets this month" | % of target sets |

**MVP goal types**: Strava = distance only. Hevy = workout count only. Keep it simple.

### User Flow

```
1. Connect wallet (Base Account / Coinbase Wallet)
2. Choose provider & connect account:
   - Strava (OAuth) for running goals
   - Hevy (API key) for gym goals
3. Create Goal:
   - Strava: "Run 10 km this week" — stake 50 USDC
   - Hevy: "Complete 4 workouts in 14 days" — stake 30 USDC
4. Deposit USDC → locked in smart contract → deposited to Morpho vault
5. Train IRL → Provider tracks → Backend verifies progress
6. Settlement:
   ✅ Goal achieved → Get deposit + yield back
   ❌ Goal failed → Graduated slashing (partial loss based on progress)
```

### Graduated Slashing Schedule

This is critical — it must feel fair, not punitive:

| Progress Achieved | Slashing % | User Gets Back |
|---|---|---|
| 0% | 80% | 20% of deposit |
| 25% | 60% | 40% of deposit |
| 50% | 40% | 60% of deposit |
| 75% | 20% | 80% of deposit |
| ≥100% | 0% | 100% + yield |

**Why graduated?** Binary pass/fail is demotivating. Graduated rewards effort and keeps users coming back after partial failures. This IS the motivational design — you're never fully punished if you tried.

### Slashed Funds Distribution

| Destination | % | Rationale |
|---|---|---|
| Community Reward Pool | 60% | Redistributed as bonuses to successful users |
| Platform Treasury | 30% | Revenue for sustainability |
| Protocol Yield Reserve | 10% | Buffer for yield smoothing |

This creates a **positive-sum ecosystem**: successful users are rewarded from the pool of those who didn't make it, creating community-aligned incentives.

**Why NOT binary pass/fail?** Binary slashing (lose everything or nothing) is demotivating and punitive. Graduated slashing IS the product — it makes the system feel fair, keeps users coming back after partial failures, and aligns with our mission of motivation. This distinction matters to judges.

### Anti-Cheat Validation (Per Provider)

**Strava (running goals):**

| Check | Rule | Rationale |
|---|---|---|
| Strava flag filter | Only count non-flagged activities | Inherit Strava's anomaly detection |
| Pace bounds | 3–12 min/km (reject vehicle/walking) | GPS spoofing or driving detection |
| Duration sanity | Min duration based on distance | 10km must take >25 min |
| Activity recency | Only count activities after `goal.created_at` | Prevents pre-completion exploit |
| Deposit cap | New users max $50; trusted (30d+) max $500 | Limits financial incentive to cheat |

**Hevy (gym goals):**

| Check | Rule | Rationale |
|---|---|---|
| Workout recency | Only count workouts with `start_time` after `goal.created_at` | Prevents pre-completion exploit |
| Min duration | Workout must be >15 min | Filters accidental/empty logs |
| Min exercise count | Workout must have ≥2 exercises | Filters fake empty workouts |
| Deposit cap | Same graduated caps as Strava | Limits cheat incentive |

**Honest acknowledgment for judges**: Hevy data is self-logged (no GPS/HR verification like Strava). We mitigate this with duration/exercise minimums and deposit caps. Long-term: explore gym check-in integrations or wearable data for stronger verification.

### Yield Strategy (Morpho on Base)

- User deposits go into **Morpho Vaults** on Base (USDC markets)
- Yield accrues while goal is active (typically 1-4 weeks)
- On settlement: principal + accrued yield returned to successful users
- Morpho Blue deployed on Base at: `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb`
- This makes the stake productive — your money works while you work

**MVP simplification**: For the demo, we can skip Morpho integration in the contract and simply escrow USDC. The Morpho integration is shown as the intended architecture and can be demonstrated with a separate integration test.

---

## 3. Revenue Model

| Revenue Stream | Mechanism | Est. Revenue |
|---|---|---|
| Platform fee | 1.5% of deposit on goal creation | Primary |
| Yield spread | 10% of generated yield | Passive |
| Slashing share | 30% of slashed funds | Variable |
| Premium features | Advanced analytics, social challenges | Future |
| B2B partnerships | Corporate wellness programs | Future |

**Unit economics example**: If a user stakes 100 USDC for a 2-week goal:
- Platform fee: $1.50
- Yield (assume 5% APY, 14 days): ~$0.19 → our 10%: $0.02
- If they fail at 50%: slashing = $40, our share = $12.00
- If they succeed: minimal revenue but user retention + ecosystem growth

---

## 4. Technical Architecture

### Stack Overview

```
Frontend:  Vite + React + wagmi/viem + TailwindCSS + shadcn/ui
Backend:   Golang + gorilla/mux + go-ethereum + SQLite
Contracts: Foundry + Solidity (Base L2)
Providers: Strava (OAuth 2.0) + Hevy (API key)
Yield:     Morpho Vaults (USDC on Base)
```

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                      FRONTEND (Vite)                      │
│  React + wagmi + viem + TailwindCSS + shadcn/ui           │
│  ┌──────┐  ┌────────────┐  ┌────────┐  ┌─────────────┐   │
│  │Wallet│  │Provider    │  │Goal    │  │Dashboard    │   │
│  │Connect│ │Connect     │  │Creator │  │& Progress   │   │
│  │      │  │Strava/Hevy │  │        │  │             │   │
│  └──────┘  └────────────┘  └────────┘  └─────────────┘   │
│         │ REST API │         │ wagmi/viem │               │
└─────────┼──────────┼─────────┼────────────┼──────────────┘
          │          │         │            │
┌─────────┼──────────┼─────────┼────────────┼──────────────┐
│         ▼          ▼         │            │              │
│  BACKEND (Golang)            │            │              │
│  ┌──────────────────────────────────────────────────┐    │
│  │         Provider Interface (abstract)             │    │
│  │  ┌──────────────┐    ┌─────────────────────┐     │    │
│  │  │ Strava       │    │ Hevy                │     │    │
│  │  │ Provider     │    │ Provider            │     │    │
│  │  │ - OAuth 2.0  │    │ - API key auth      │     │    │
│  │  │ - Webhooks   │    │ - Poll /v1/workouts │     │    │
│  │  │ - GPS data   │    │ - Workout count     │     │    │
│  │  └──────────────┘    └─────────────────────┘     │    │
│  └──────────────────────────────────────────────────┘    │
│  ┌────────────┐  ┌─────────┐  ┌───────────┐             │
│  │Goal Engine │  │EIP-712  │  │Validation │             │
│  │& Verifier  │  │Signer   │  │& AntiCheat│             │
│  └────────────┘  └─────────┘  └───────────┘             │
└──────────────────────────────┼────────────┼──────────────┘
                               │            │
┌──────────────────────────────┼────────────┼──────────────┐
│  SMART CONTRACTS (Foundry)   │            │              │
│                              ▼            ▼              │
│  ┌──────────────────────────────────────────────────┐    │
│  │              GoalVault.sol                        │    │
│  │  - createGoal()       - deposit()                │    │
│  │  - verifyAndSettle()  - claimBack()              │    │
│  │  - slash()            - emergencyWithdraw()      │    │
│  └──────────┬───────────────────────────────────────┘    │
│             │                                            │
│  ┌──────────▼───────────────────────────────────────┐    │
│  │         Morpho Vault (USDC on Base)               │    │
│  │  - deposit yield-bearing                          │    │
│  │  - withdraw on settlement                         │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Network: Base (Ethereum L2)                             │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Smart Contract Design (Foundry / Solidity)

### Core Contract: `GoalVault.sol`

```solidity
enum GoalType { Distance, Count }       // Distance (Strava) or Count (Hevy/frequency)
enum GoalStatus { None, Active, Achieved, Failed, Cancelled }

struct Goal {
    address user;
    GoalType goalType;          // Distance or Count
    uint256 targetValue;        // meters (distance) OR count (workouts/runs)
    uint256 deadline;           // unix timestamp
    uint256 stakeAmount;        // USDC amount (6 decimals)
    uint256 actualValue;        // verified progress (distance or count)
    uint256 depositedAt;       // when deposited
    uint256 morphoShares;      // shares in Morpho vault
    GoalStatus status;
    bool settled;
}
```

### Key Functions

| Function | Access | Description |
|---|---|---|
| `createGoal(goalType, target, deadline)` | User | Creates goal struct, emits event |
| `deposit(goalId)` | User | Transfers USDC from user, deposits to Morpho |
| `verifyAndSettle(goalId, actualValue, signature)` | Backend (EIP-712) | Verifies goal outcome via signed message |
| `claimBack(goalId)` | User | Withdraws deposit + yield (if achieved) |
| `slash(goalId)` | Anyone (after settle) | Executes slashing per graduated schedule |

### Security Model
- **Verification**: Backend signs an EIP-712 message with verified distance. Contract checks signature against trusted signer address.
- **No oracle dependency**: We trust the backend as a "Strava oracle" — it reads Strava data and attests onchain.
- **Emergency withdraw**: Time-locked admin function for edge cases.
- **Reentrancy guards**: OpenZeppelin ReentrancyGuard on all state-changing functions.
- **Morpho vault interaction**: Only deposit/withdraw from whitelisted Morpho vault address.

### MVP Simplification (for 1-week timeline)
For the demo, the contract can:
1. Simply hold USDC in escrow (skip Morpho deposit in contract)
2. Use a simpler verification model (backend-signed message)
3. Focus on the graduated slashing logic
4. Morpho integration demonstrated via separate script/test

---

## 6. Backend Design (Golang)

### Project Structure
```
backend/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── config/         # Environment, API keys, contract addresses
│   ├── provider/       # Provider interface + implementations
│   │   ├── provider.go       # Interface: FetchProgress, ValidateActivity, AuthURL
│   │   ├── strava.go         # Strava: OAuth, webhooks, distance aggregation
│   │   └── hevy.go           # Hevy: API key, workout count, duration checks
│   ├── goal/           # Goal lifecycle management
│   ├── signer/         # EIP-712 message signing (go-ethereum)
│   ├── validation/     # Anti-cheat: pace bounds, duration sanity, recency checks
│   └── api/            # REST handlers
├── pkg/
│   └── crypto/         # EIP-712 signing utilities
└── go.mod
```

### Key Components

#### 0. Provider Interface (`internal/provider/provider.go`)

```go
type Provider interface {
    // Auth
    GetAuthURL(state string) string
    HandleCallback(code string) (string, error)  // returns provider user ID

    // Progress
    FetchProgress(ctx context.Context, userID string, goalType GoalType,
        since time.Time) (uint64, error)

    // Validation
    ValidateActivity(ctx context.Context, userID string, goal Goal) error
}
```

Both `StravaProvider` and `HevyProvider` implement this interface. The Goal Engine doesn't care which provider it's talking to — it calls `FetchProgress` and gets back a number. This is the key architectural win for judges.

#### 1. Strava Provider (`internal/provider/strava.go`)
- **OAuth 2.0 flow**: Redirect user → Strava auth → callback with code → exchange for tokens
- **Webhook subscription**: Subscribe to `activity.create` events
- **FetchProgress**: Aggregates distance from activities in goal timeframe
- **Validation**: Filters flagged activities, pace bounds (3-12 min/km), duration sanity
- **Token management**: Auto-refresh tokens (6-hour expiry)

#### 2. Hevy Provider (`internal/provider/hevy.go`)
- **Auth**: User provides their Hevy API key (obtained from hevy.com/settings?developer)
- **FetchProgress**: Calls `GET /v1/workouts` filtered by date range, returns workout count
- **Validation**: Min duration >15 min, min exercises ≥2 per workout
- **No webhooks**: Poll via `GET /v1/workouts/events?since=` for changes
- **Note**: Hevy API is Pro-users only — ideal early adopters (already invested in fitness)

#### 3. Goal Engine (`internal/goal/`)
- **Goal creation**: Validate params, store in DB, map to correct provider
- **Progress tracker**: Calls `provider.FetchProgress()` for active goals
- **Auto-settlement**: Cron job checks expired goals → verify outcome → sign message
- **Only counts post-creation activity**: `since` parameter = `goal.created_at`

#### 4. Anti-Cheat Validation (`internal/validation/`)
- Applies per-provider validation rules (see Anti-Cheat table in Section 2)
- Rejects activities before goal creation (pre-completion exploit)
- Returns validated progress value only

#### 5. EIP-712 Signer (`internal/signer/`)
- Sign goal verification messages using a backend private key (stored in KMS)
- Contract verifies against the corresponding public address
- Message includes: goalId, actualValue, achieved (bool), timestamp

#### 6. REST API (`internal/api/`)

| Endpoint | Method | Description |
|---|---|---|
| `GET /auth/strava` | GET | Initiate Strava OAuth |
| `GET /auth/strava/callback` | GET | OAuth callback |
| `POST /auth/hevy` | POST | Submit Hevy API key |
| `GET /api/goals` | GET | List user's goals |
| `POST /api/goals` | POST | Create goal (provider, goalType, target, deadline, stake) |
| `GET /api/goals/:id/progress` | GET | Get current progress for a goal |
| `POST /api/goals/:id/settle` | POST | Trigger settlement check |
| `GET /api/leaderboard` | GET | Community leaderboard |

### Database
- **SQLite** for MVP (simple, no infra needed)
- Tables: `users`, `goals`, `provider_tokens` (Strava OAuth + Hevy API keys), `activities`
- Consider PostgreSQL for production

### Key Libraries
- `go-ethereum` — Ethereum interaction, EIP-712 signing
- `gorilla/mux` or `gin` — HTTP routing
- `gorm` — ORM (optional, can use raw SQL for speed)

---

## 7. Frontend Design (Vite + React)

### Tech Stack
- **Vite** — Build tool
- **React 19** — UI framework
- **wagmi v2 + viem** — Wallet & chain interaction
- **TailwindCSS + shadcn/ui** — Styling (elegant, clean)
- **React Router** — Navigation
- **TanStack Query** — Data fetching & caching
- **recharts** or **d3** — Progress visualization

### Pages & Components

#### 1. Landing Page (`/`)
- Hero: "Stake on yourself. Earn while you grind."
- How it works (3-step visual)
- Dual provider showcase: "Running? Strava. Gym? Hevy."
- Stats: Total staked, Goals completed, Yield earned
- CTA: "Connect Wallet & Get Started"

#### 2. Dashboard (`/dashboard`)
- Active goals with real-time progress bars (distance ring OR workout count)
- Provider badge on each goal (Strava icon / Hevy icon)
- Current stake value + estimated yield
- Upcoming deadlines

#### 3. Create Goal (`/create`)
- Step 1: **Choose activity** — Strava (running) or Hevy (gym)
- Step 2: Set goal type & target (dynamic based on provider)
  - Strava: distance target (e.g., "Run 10 km")
  - Hevy: workout count target (e.g., "Complete 4 gym sessions")
- Step 3: Set deadline
- Step 4: Set stake amount (USDC slider with min/max based on trust level)
- Step 5: Review & confirm (show slashing schedule)
- Step 6: Deposit (wagmi transaction flow)

#### 4. Goal Detail (`/goal/:id`)
- Progress visualization (distance ring for Strava / count badge for Hevy)
- Timeline of contributing activities/workouts
- Stake status (in Morpho, earning X% APY)
- Countdown to deadline
- Settle/Claim button when applicable

#### 5. Leaderboard (`/leaderboard`)
- Top goal completers
- Most ambitious goals achieved
- Community stats

### UX Principles
- **Dark mode by default** (crypto convention)
- **Mobile-first** (runners check phones)
- **Minimal wallet friction**: Base Account / Coinbase Wallet for gasless UX
- **Real-time sync**: Poll backend every 30s for Strava progress
- **Visual feedback**: Animated progress rings, confetti on goal completion

---

## 8. Competition Strategy

### What Base Judges Look For

Based on Base's 2025 strategy pillars and competition structure:

1. **Consumer app with real usage** → Fitness commitment has massive TAM (running + gym)
2. **Onchain transactions via usage** → Every goal = deposit tx + settle tx
3. **DeFi integration** → Morpho yield generation
4. **Asset issuance/management** → USDC deposits, yield distribution
5. **Base Account integration** → Gasless onboarding
6. **Founder-market fit** → Student + crypto + fitness enthusiast

### Application Answers (Draft)

#### Company Name
`Stride` (or NazarETH or whichever chosen)

#### Describe what your company does (~50 chars)
`Onchain commitment staking for fitness goals — earn yield, hit targets.`

#### Unique Value Proposition
No existing platform combines verifiable real-world fitness activity with onchain financial stakes and yield generation. We support both running (Strava) and gym training (Hevy), turning laziness into a quantifiable financial loss and achievement into a yield-generating win. The provider-abstracted architecture means any future fitness API can plug in.

#### What part of your product is onchain?
- Goal creation and stake deposits (USDC escrow on Base)
- Morpho vault integration for yield generation
- Graduated slashing and settlement logic (immutable, auditable)
- All fund flows: deposit → yield → return/slash

#### Ideal Customer Profile
Health-conscious crypto-native individuals aged 18-35 who track fitness (running via Strava, gym via Hevy) and want external financial motivation to hit goals. Secondary: crypto-curious fitness enthusiasts looking for their first meaningful onchain experience.

#### Category
Consumer App / DeFi App

#### What part of your product uses Base?
All smart contracts deploy exclusively on Base. USDC deposits, Morpho yield generation, and goal settlement all execute on Base. We leverage Base's low fees (<$0.01), sub-second block times, and Base Account for gasless onboarding. Morpho's USDC vaults on Base provide the yield engine.

#### What part of your product is magic or impressive?
Bridging real-world physical activity with onchain financial outcomes through multi-provider API verification. Your morning jog or gym session literally moves money onchain. The graduated slashing mechanism — which rewards effort, not just binary success — is a novel design that makes the system motivating rather than punitive. The provider abstraction means the protocol is fitness-activity agnostic.

#### Unique insight or advantage
People fail at fitness goals not from lack of desire but lack of immediate consequence. Behavioral economics shows "loss aversion" is 2x more motivating than equivalent gains. We weaponize this: stake money you'll lose if you quit, earn yield if you succeed. Fitness APIs (Strava, Hevy) provide verified activity data — no self-reporting. The platform is provider-agnostic, meaning the commitment mechanism works for any quantifiable activity.

#### Why do you want to join Base Batches?
Base is the only chain where this product makes economic sense — sub-cent fees make micro-stakes viable, Morpho provides the yield engine natively, and Base Account enables gasless onboarding for non-crypto-native fitness users. We want to build the first consumer fitness commitment protocol onchain, and Base's consumer focus + DeFi infrastructure is the perfect foundation.

---

## 9. One-Week Execution Timeline

### Day 1 (April 22): Foundation
- [ ] Initialize Foundry project, write `GoalVault.sol` skeleton
- [ ] Initialize Go project with provider interface abstraction
- [ ] Initialize Vite + React + TailwindCSS + shadcn/ui
- [ ] Strava Developer Account setup (create app, get credentials)
- [ ] Hevy Developer Account setup (get API key from hevy.com/settings?developer)
- [ ] Set up Base Sepolia testnet config in all projects

### Day 2 (April 23): Smart Contracts Core
- [ ] Complete `GoalVault.sol` with GoalType enum (Distance/Count), all functions
- [ ] Write Foundry tests (create, deposit, settle, slash flows)
- [ ] Deploy to Base Sepolia
- [ ] Test with mock USDC (or real USDC on testnet)

### Day 3 (April 24): Backend Core
- [ ] Implement provider interface (`provider.go`)
- [ ] Strava provider: OAuth flow, activity fetcher, distance aggregation
- [ ] Hevy provider: API key auth, workout fetcher, count aggregation
- [ ] Anti-cheat validation module (pace bounds, duration, recency)
- [ ] Goal lifecycle service (create, track, settle)
- [ ] EIP-712 signing service
- [ ] SQLite schema + basic CRUD
- [ ] REST API endpoints

### Day 4 (April 25): Frontend Core
- [ ] Wallet connection (Coinbase Wallet / Base Account)
- [ ] Provider connection flow (Strava OAuth + Hevy API key input)
- [ ] Goal creation wizard (provider choice → goal type → target → stake)
- [ ] Dashboard with active goals (distance ring + count badge)
- [ ] Progress visualization

### Day 5 (April 26): Integration
- [ ] End-to-end flow: choose provider → create goal → deposit → train → verify → settle
- [ ] Connect all three layers
- [ ] Error handling and edge cases
- [ ] Deploy frontend (Vercel)
- [ ] Deploy backend (Railway / Fly.io)

### Day 6 (April 26 eve - April 27 morn): Polish & Submit
- [ ] UI polish (animations, responsive design)
- [ ] Demo video recording (~1 minute)
- [ ] Founder introduction video (~1 minute)
- [ ] GitHub README with architecture docs
- [ ] Fill Devfolio application form
- [ ] Submit before April 27 deadline

---

## 10. Gap Analysis & Attack Surfaces

### GAP 1 — CRITICAL: Activity Data Manipulation (Cheating)

**The exploit**: A user stakes $500, then GPS-spofs a 10km run (Strava) or logs an empty workout (Hevy) to claim their deposit + yield without effort.

**Why it kills the pitch**: Judges will immediately ask "what if I just shake my phone?" If no credible answer, the concept falls apart.

**Mitigations we implement (MVP)**:

| Layer | Mitigation | Provider |
|---|---|---|
| Strava-native | Only count activities NOT flagged by Strava anomaly detection | Strava |
| Pace bounds | Reject pace <3 min/km (vehicle) or >12 min/km (walking) | Strava |
| Duration sanity | Min duration based on distance (10km must take >25 min) | Strava |
| Hevy duration | Workout must be >15 min, ≥2 exercises | Hevy |
| Activity recency | Only count activities/workouts AFTER `goal.created_at` | Both |
| Deposit caps | New users max $50; trusted (30d+) max $500 | Both |

**Mitigations for roadmap**:
- Heart rate gating (Strava) — harder to fake, but reduces user base
- GPS trace analysis — reject straight-line constant-speed paths
- Community flagging — users report suspicious activities
- Hevy: gym WiFi check-in integration for location verification

**For the pitch**: *"We inherit each provider's existing trust layer as our base — Strava's GPS anomaly detection and Hevy's workout structure — then add our own validation heuristics: pace bounds, duration minimums, and recency checks. For V1, deposit caps limit the financial incentive to cheat. As the platform grows, we layer in stronger verification like heart rate gating and community flagging."*

---

### GAP 2 — CRITICAL: "Why Does This Need Crypto?"

**The question**: *"Why not just use Stripe? What's the onchain value?"*

**Strong answer (5 points)**:
1. **Trustless escrow** — Money locked in a smart contract. No company can refuse to return it. Rules are immutable code.
2. **Yield on stake** — Deposit earns yield via Morpho while you train. Impossible with Stripe escrow.
3. **Programmable slashing** — Graduated, transparent, auditable by anyone. No company deciding if you "really" ran.
4. **Global access** — No bank account needed. Anyone with a phone + wallet participates. Base's <1c fees make micro-stakes viable.
5. **Composability** — Other protocols can build on this: insurance on goals, social tokens for communities, derivatives on goal success rates.

**Frame it as**: *"Stripe can hold your money. Base can make it work for you."*

---

### GAP 3 — HIGH: Centralized Backend as Trust Bottleneck

**The problem**: Backend reads provider data → signs EIP-712 message → contract trusts it. Backend operator could forge verifications. Hacked backend could drain funds.

**Mitigations**:

| Approach | Description | Timeline |
|---|---|---|
| KMS-stored signing key | Private key in AWS/GCP KMS, never in code | MVP |
| Open-source backend | Verifiable code, auditable by community | MVP |
| Multi-sig verification | M-of-N signers required | Post-MVP |
| Chainlink Functions | Fetch provider APIs directly onchain | Roadmap |
| Optimistic verification | Anyone can challenge a verification within a window | Roadmap |

**For the pitch**: *"V1 uses a trusted backend signer — similar to how many DeFi protocols start. The signing key is secured in KMS, the backend is open-source. Our roadmap moves to Chainlink Functions for decentralized verification."*

---

### GAP 4 — HIGH: Platform Dependency Risk (Strava / Hevy)

**From Strava ToS**: *"Use of Strava's API is a privilege... Strava may revoke your API Token... at any time."* Strava can kill our product with zero notice.

**From Hevy API**: *"Currently, this API is only available to Hevy Pro users... we make no guarantees that we won't completely change the structure."*

**Mitigations**:
1. Having TWO providers already halves this risk — if Strava cuts access, Hevy keeps us alive
2. Submit Strava app for review ASAP (before deadline)
3. Position carefully: "commitment platform that uses fitness APIs for verification" — NOT "betting on Strava data"
4. Strava ToS §2.15 explicitly allows charging for our own functionality — legal
5. **Roadmap multi-platform**: Apple Health, Garmin Connect, Google Fit, WHOOP

**For the pitch**: *"We start with Strava and Hevy because they're the gold standard for running and gym tracking. But our architecture is verification-source agnostic — any API that provides trusted activity data can plug in."*

---

### GAP 5 — MEDIUM: Pre-Completion Timing Exploit

**The exploit**: User runs 10km Monday → creates goal Tuesday → Monday's run counts toward the goal → free money.

**Fix**: One line in backend — `since = goal.created_at`. Already built into the provider interface's `FetchProgress` parameter. Trivial but must not forget.

---

### GAP 6 — MEDIUM: Economic Sybil on Community Rewards

**The exploit**: User creates 10 wallets, 10 goals. Succeeds with 9, fails with 1. Slashed funds from wallet 10 go to community pool. User claims bonus with 9 wallets.

**Why it doesn't work**: Community pool distributes across ALL successful users platform-wide. Attacker's 9 wallets dilute in the broader pool. Net result: attacker always loses more on the failed wallet than they gain from the pool.

**Additional mitigation**: One provider account per wallet (enforced in backend). Creating 10 Strava/Hevy accounts is non-trivial.

---

### GAP 7 — MEDIUM: Selection Bias / Adverse Selection

**The concern**: Only confident users stake → high success rate → low slashing → small reward pool → weak incentive.

**Reframe as feature**: We WANT users to succeed. High success rate = retention + referrals + viral growth. Platform fee + yield spread sustains revenue. Slashing is the psychological motivator, not the economic engine.

**Precedent**: StickK (Yale-founded) found financial stakes increase completion 3x, but most users still succeed. Their revenue comes from the commitment mechanism, not failures.

---

### GAP 8 — LOW-MEDIUM: Regulatory Ambiguity

**The question**: Is this gambling? Users stake money on an outcome.

**Counter-arguments**:
- Outcome depends on user's own effort/skill, not chance → not gambling
- Legal precedent: StickK.com (Yale-founded, 2008), DietBet, HealthyWage, Beeminder — all operate legally with identical commitment contracts
- DeFi yield (Morpho) is lending, not gambling

**Strategy**: Don't raise this proactively. If asked, name-drop StickK and DietBet as web2 precedents.

---

### Gap Summary: What to Address

| Gap | Address in Pitch? | Address in Code? |
|---|---|---|
| Activity manipulation | YES — awareness + mitigations | YES — pace/duration/caps |
| "Why crypto?" | YES — core narrative | YES — Morpho, trustless escrow |
| Centralized backend | YES — acknowledge + roadmap | YES — open-source, KMS |
| Platform dependency | Briefly — multi-provider roadmap | YES — provider interface |
| Timing exploit | NO (internal) | YES — one-line fix |
| Sybil economics | If asked | One account per wallet |
| Selection bias | NO (reframe as feature) | NO |
| Regulatory | Only if asked | NO |

---

## 11. Post-Competition Roadmap (If Selected)

### Phase 1: MVP Polish (Month 1-2)
- Full Morpho vault integration in smart contract
- Strava webhook (real-time activity sync)
- Hevy events polling (efficient sync)
- Base Account gasless onboarding
- Mobile-responsive polish

### Phase 2: Growth Features (Month 3-4)
- Social challenges (group goals, friend challenges)
- Leaderboard with rewards
- Multi-sport support (cycling, swimming via Strava)
- Hevy volume-based goals (total sets, duration)
- Achievement NFTs (soulbound tokens for completed goals)
- Heart rate gating (Strava) for stronger verification

### Phase 3: Scale (Month 5-6)
- Additional providers: Apple Health, Garmin Connect, Google Fit, WHOOP
- Chainlink Functions for decentralized verification
- Corporate wellness B2B partnerships
- Governance token for community decisions
- Cross-chain expansion (but Base as home)

---

## 12. Key Decisions Needed

1. **Product name**: NazarETH vs Stride vs CommitFi vs Grind vs other?
2. **Morpho in MVP**: Include in contract or skip for escrow-only?
3. **Backend hosting**: Railway vs Fly.io vs self-hosted?
4. **Frontend hosting**: Vercel (free tier)?
5. **Testnet vs mainnet demo**: Base Sepolia for demo, or deploy on Base mainnet with real (small) USDC?
6. **Strava scope**: `read` vs `read,activity:read_all` (need activity:read_all for detailed data)
7. **Database**: SQLite (MVP) vs PostgreSQL (production-ready)?
8. **Hevy goal type for MVP**: Workout count only, or also volume (total sets)?
9. **Strava app review**: Submit for review immediately, or demo with personal data only?
10. **Deposit currency**: USDC only for MVP, or also IDRX (Indonesian stablecoin on Base)?

---

*This document is a living blueprint. Update as decisions are made and implementation progresses.*
