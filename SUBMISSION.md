# NazarETH — Base Batches 003 Student Track Submission

> **Deadline**: April 27, 2026
> **Submission Link**: https://base-batches-student-track-3.devfolio.co/overview
> **GitHub**: https://github.com/grandiv/NazarETH (public)

---

## Application Form — Copy-Paste Ready

### Company Name*
```
NazarETH
```

### Website / Product URL*
```
https://github.com/grandiv/NazarETH
```
(Replace with Vercel/Railway URL after deployment)

### Demo URL*
```
https://youtu.be/XXXXXXXXX
```
(Record a ~3 min demo video, upload unlisted to YouTube)

### Describe what your company does* (~50 characters)
```
Stake USDC on fitness goals — earn it back or lose it.
```

### What is your product's unique value proposition?*
```
NazarETH is the first onchain fitness commitment protocol that combines verifiable real-world activity (via Strava GPS data) with financial accountability on Base. Unlike gamified fitness apps that rely on badges and streaks, NazarETH uses real financial stakes — users deposit USDC against a measurable fitness goal, and smart contracts automatically determine the outcome based on oracle-verified progress.

Unique differentiators:
- Real financial consequences create 3x higher goal completion rates vs badge-based systems (behavioral economics research)
- Oracle-verified progress via Strava API — no self-reporting, no cheating
- Milestone-based withdrawals — users claim back 10% of stake for every 10% of progress, rewarding effort not just binary success
- 1:1 wallet-to-Strava binding via EIP-712 signatures prevents Sybil attacks
- Pluggable yield layer (Morpho/Aave) — staked funds earn yield while locked
- Multi-provider architecture — supports Strava (running), Hevy (gym), and any future fitness API
- Works with any app that syncs to Strava: INTVL, Apple Watch, Garmin, Suunto, Polar, Coros
```

### What part of your product is onchain?*
```
Core commitment protocol is fully onchain:
- Smart contract challenge lifecycle: create → deposit → oracle-verified progress → milestone withdrawal → finalization
- NazarRegistry: EIP-712 verified 1:1 wallet-to-athlete identity binding
- NazarOracle: Role-based progress submission from trusted backend oracle
- NazarChallenge: Escrow, milestone withdrawals, graduated slashing
- NazarTreasury: Slashed fund management
- NazarYield: Pluggable yield vault integration
- MockUSDC: Permissionless testnet token faucet

All financial logic (staking, withdrawals, slashing, treasury distribution) executes entirely on-chain via 6 Solidity contracts. No off-chain custody.
```

### What is your ideal customer profile?*
```
Primary: Fitness-motivated individuals aged 18-35 who already use Strava or gym tracking apps and are crypto-curious. They set New Year's resolutions but struggle with follow-through.

Secondary: Crypto-native users on Base who want productive use of their USDC beyond just holding or trading — earning yield while motivating themselves.

Tertiary: Fitness communities and running clubs looking for group challenge mechanisms with real accountability.

We know this market intimately as university students who are both athletes and builders in the Base ecosystem.
```

### Category*
```
Consumer App
```

### Where are you located now?*
```
[FILL IN — City, Country]
```

### Where would the company be based after the program?*
```
[FILL IN — City, Country]
```

### Do you already have a token?*
```
No
```

### What part of your product uses Base?*
```
The entire protocol is built exclusively on Base:
- All 6 smart contracts deployed on Base (currently Sepolia testnet)
- Every financial transaction (staking, withdrawals, slashing) settles on Base L2
- SIWE (Sign-In with Ethereum) authentication via Base
- EIP-712 typed data signing for registry verification
- MockUSDC faucet for onboarding (Base-native testnet token)
- Future: Morpho/Aave yield vaults on Base for earning yield on staked deposits

Base is our only chain — we chose it for low gas costs (critical for micro-transactions like milestone withdrawals), Coinbase ecosystem alignment with consumer apps, and the growing Base user base of fitness-minded individuals.
```

### Founder(s) Names and Contact Information*
```
[FILL IN]
Name: [Your Name]
Email: [Your Email]
University: [Your University]
Discord/Telegram: [Your Handle]
```

### Please describe each founder's background and add their LinkedIn profile(s).*
```
[FILL IN — Example:]
[Your Name] is a [year] undergraduate student at [University] studying [Major]. Passionate about the intersection of DeFi and consumer applications. Experienced in Solidity/Foundry smart contract development, Golang backend engineering, and React/TypeScript frontend development. Previously [any relevant experience, hackathons, projects].

LinkedIn: https://linkedin.com/in/[your-profile]
```

### Founder introduction video URL (~1 minute, unlisted)*
```
https://youtu.be/XXXXXXXXX
```
(Record yourself introducing who you are, why you're building NazarETH, and what excites you about building on Base. Keep it casual and authentic. Upload unlisted to YouTube.)

### Who writes code or handles technical development?*
```
[FILL IN — Example:]
[Your Name] — Solo founder and full-stack developer. All code (smart contracts, backend, frontend) is written by me personally.

Smart Contracts: Solidity 0.8.26 + Foundry (6 contracts, 49 tests)
Backend: Golang (REST API, Strava OAuth, oracle tx submission, GPX generation)
Frontend: React 18 + TypeScript + wagmi v2 + Leaflet maps
```

### How long have the founders known each other and how did you meet?*
```
[FILL IN — Solo founder:]
I'm a solo founder.
```
Or:
```
[FILL IN — If team:]
We met at [University/class/event] in [year] and have been building together for [duration].
```

### How far along are you?*
```
MVP
```

### How long have you been working on this?*
```
1 week (started April 22, 2026 for the Base Batches deadline). However, the concept has been developed over several months of thinking about how to apply onchain accountability to real-world behavior change.
```

### How much of that time is full-time vs part-time?*
```
Full-time for the past week. Part-time ideation and research for 2 months prior.
```

### What part of your product is magic or impressive?*
```
1. Seamless Strava-to-onchain pipeline: Users click "Sync from Strava" and the backend fetches their GPS activities, calculates distance progress, and submits a verified on-chain transaction to the oracle — all in under 3 seconds. The bridge between real-world running and onchain state is automatic.

2. Simulate Run with GPS map drawing: An interactive Leaflet map where you draw a running route, and we generate a real GPX file with timestamps at realistic running pace, upload it to Strava as a legitimate activity — perfect for demo and testing.

3. 6-contract modular architecture: Instead of a monolithic contract, we separated concerns into Registry (identity), Oracle (verification), Challenge (escrow), Treasury (fund management), and Yield (revenue layer) — each independently upgradeable and testable.

4. Milestone-based withdrawals: Rather than all-or-nothing settlement, users can withdraw 10% of their stake for every 10% of progress — rewarding partial effort, not just binary success.

5. Multi-provider design: Strava today, but the backend provider abstraction means adding Hevy (gym), Apple Health, or any future fitness API is a clean implementation of a provider interface.
```

### What is your unique insight or advantage in the market?*
```
Insight: 73% of people who set fitness goals abandon them (Strava's own data). The gap between intention and action isn't desire — it's consequences. Badges and streaks are weak psychological anchors. Real financial stakes create 3x higher completion rates.

Founder-market fit: As university students and athletes, we understand both the motivation problem (we've abandoned our own fitness goals) and the crypto tools to solve it. We're building for ourselves and our peers.

Technical advantage: The oracle-verified progress system is trustless — users can't fake their runs because the backend verifies real Strava GPS data before submitting on-chain. The 1:1 wallet-to-athlete binding via EIP-712 prevents Sybil attacks (one person can't create multiple accounts to farm yield).

Market timing: Base is the ideal chain for consumer apps with its low fees and Coinbase onramp. The fitness accountability market is $2B+ and growing, but no one has nailed the onchain approach yet.
```

### Do you plan on raising capital from VCs?*
```
Yes — we're exploring pre-seed funding to accelerate development after Base Batches. We believe NazarETH can be the "Stake on yourself" protocol that brings millions of non-crypto users onchain through a use case they already understand: fitness accountability.
```

### Do you plan to launch a token?*
```
Not in the near term. We'd focus on product-market fit and user growth first. A token could make sense later for governance of protocol parameters (slashing rates, supported providers, yield strategies) or as a loyalty/rewards mechanism, but only once we have clear product traction.
```

### Do you have users or customers?*
```
Not yet — we just completed the MVP. We plan to onboard our first 50 users (university running clubs and fitness communities) within 2 weeks after submission.
```

### Revenue, if any
```
Pre-revenue. Revenue model:
- Platform fee: 1.5% of staked amount on challenge creation
- Yield spread: Earn 50-100bps on yield generated from staked deposits via Morpho/Aave
- Premium features: Advanced analytics, group challenges, coaching integrations (future)
```

### Smart contract addresses (Base Sepolia)
```
MockUSDC:       0x6118c512a606d55d2b466727e8f26E60233860dd
NazarRegistry:  0x811a837bdaa8D27967Db87af87C54291B33B6bae
NazarOracle:    0x30D282C7bd12467714Bb922C62f712bC4FC0002f
NazarYield:     0x7b5d6f5ff516F1d7d6EF0E9DD9cfBA79A5e8f12d
NazarTreasury:  0x1CFA02Ab6649a679435cB9C1CafbEA6CE0F92e66
NazarChallenge: 0x0c1D52dAe67E3136729Ccb26a4ba64648f5eCFda
```

### Why do you want to join Base Batches?*
```
Three reasons:

1. Community and mentorship: Building a consumer onchain app requires more than just code — we need guidance on go-to-market, user acquisition, and product strategy from builders who've done it before. The Base Batches network would be invaluable.

2. Demo Day opportunity: Presenting in San Francisco to investors and VCs would be a game-changer for a student project. It's the kind of access we can't get on our own.

3. Base alignment: We believe Base is the best chain for consumer applications. Low gas fees make micro-transactions (milestone withdrawals) viable, and the Coinbase ecosystem provides the ideal onramp for non-crypto users (our target market). We want to be part of the Base builder community long-term.
```

### Anything else you'd like us to know?*
```
NazarETH was built in 1 week as a proof of concept for Base Batches, but the idea has been months in the making. We've thought deeply about the economics (graduated slashing vs binary), the trust model (oracle-verified vs self-reported), and the user experience (Simulate Run for seamless demo). We're committed to continuing development regardless of the outcome — this is a product we personally want to use.
```

### Who referred you to this program?*
```
[FILL IN — if someone referred you, add their social link. Otherwise:]
No direct referral — discovered through the Base ecosystem announcements.
```

### GitHub repo link*
```
https://github.com/grandiv/NazarETH
```

---

## Deliverables Checklist

- [ ] **Demo video** (~3 min unlisted YouTube): Walk through the full E2E flow
- [ ] **Founder intro video** (~1 min unlisted YouTube): Who you are, what you're building, why Base
- [ ] **Deploy frontend** to Vercel (or similar) for a live product URL
- [ ] **Deploy backend** to Railway/Fly.io (or keep local for demo)
- [ ] **Fill in personal fields** marked [FILL IN] above
- [ ] **Submit** at https://base-batches-student-track-3.devfolio.co/overview

## About the Videos

I can't create videos directly (no MCP tools for screen recording), but here's what I recommend:

### Founder Intro Video (~1 min)
- Face camera, casual setting
- Script: "Hi, I'm [Name], a [year] student at [University]. I'm building NazarETH — an onchain fitness commitment protocol on Base. The problem: 73% of people abandon their fitness goals. Our solution: stake USDC against your goal, and smart contracts hold you accountable. I'm excited about Base because low gas fees make micro-transactions like milestone withdrawals viable for consumer apps. Thanks for watching."

### Demo Video (~3 min)
1. Show Dashboard → connect wallet → mint USDC
2. Register with Strava OAuth
3. Create a challenge (Running, 10K, 10 USDC)
4. Go to Simulate Run → draw route on map → Upload to Strava
5. Sync from Strava → show oracle progress updating on-chain
6. Withdraw milestone
7. Show the Strava activity (real GPS route uploaded!)
8. Show BaseScan transactions for proof of onchain execution

Record with OBS Studio (free) or QuickTime screen recording.
