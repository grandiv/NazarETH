import abis from './abis.json'

// ─── Deployed addresses (Base Sepolia — MockUSDC, 2-min durations for PoC) ──
export const ADDRESSES = {
  MockUSDC:       '0x088B58BCdD68E3411f36170A105658bd1014c6a6',
  NazarRegistry:  '0xe5F730645870d573A9a9B9a0133d6cE7aA8bD089',
  NazarOracle:    '0xb7592f34b512092857A785329E1a3aEeBC728ca8',
  NazarYield:     '0x0F69f8e2dAb38714b6e52E8BA0d922D084512886',
  NazarTreasury:  '0x884609eeBfb89f3Edb8CB06b751aAEdE48618eE3',
  NazarChallenge: '0xbF4551c7D4Ec55ecb893c93846dEF76bA6ab655E',
} as const

// ─── Known accounts ─────────────────────────────────────────────────────────
export const KNOWN_ACCOUNTS = {
  admin: '0x40C3DD9a3aA86206655F14115897227f302C8B8A',
} as const

// ─── ABI exports ─────────────────────────────────────────────────────────────
export const NazarChallengeAbi   = abis.NazarChallenge as readonly object[]
export const NazarRegistryAbi    = abis.NazarRegistry  as readonly object[]
export const NazarOracleAbi      = abis.NazarOracle    as readonly object[]
export const NazarTreasuryAbi    = abis.NazarTreasury  as readonly object[]
export const MockUSDAbi          = abis.MockUSDC        as readonly object[]

// ─── Activity types ──────────────────────────────────────────────────────────
// keccak256 of each activity name (must match what the contract expects)
export const ACTIVITY_TYPES = {
  running:  '0x4e45c7c91129f5ae76a510707a27b402fd8be2688a505b20884082c04ede7c89',
  cycling:  '0x97bb3aadbe11b7bc5840305bc7c2470f9508ff509ba191ca10dc148456fef79f',
  swimming: '0xe3e03e387e9587e5ad571016cc7a887da2d9848343f3926493fc1fcc5d7c2d5d',
} as const

// ─── Utils ───────────────────────────────────────────────────────────────────
export const USDC_DECIMALS = 6n
export const BPS_DENOMINATOR = 10_000n

export function formatUSDC(raw: bigint): string {
  const whole = raw / 10n ** USDC_DECIMALS
  const frac  = raw % 10n ** USDC_DECIMALS
  return `${whole}.${frac.toString().padStart(6, '0').slice(0, 2)}`
}

export function parseUSDC(amount: string): bigint {
  const [whole, frac = '0'] = amount.split('.')
  const fracPadded = frac.slice(0, 6).padEnd(6, '0')
  return BigInt(whole) * 10n ** USDC_DECIMALS + BigInt(fracPadded)
}

export function formatBps(bps: bigint): string {
  return `${(Number(bps) / 100).toFixed(0)}%`
}

export function formatDeadline(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export const BACKEND_URL = 'http://localhost:8080'

export const CHALLENGE_STATUS = ['NotStarted', 'Created', 'Active', 'Finalized'] as const
