import abis from './abis.json'

// ─── Deployed addresses (Base Sepolia — MockUSDC, 2-min durations for PoC) ──
export const ADDRESSES = {
  MockUSDC:       '0xcEf88f18f5Cc53f8c0722FC370400D3dF023BA68',
  NazarRegistry:  '0xE3f97d85e2f1aEDcCE7D010A051d5b403c5a4583',
  NazarOracle:    '0xEc6340c09531BfFC9D53348Abf58598D4A0f2156',
  NazarYield:     '0xb8D3fBaFeA79Bc8c151ff058b9d24776099Da4Fa',
  NazarTreasury:  '0x4eDCa9b2Bd1601f527FA87656802a51d5390BA4C',
  NazarChallenge: '0x5e37c9da0083fF21559aC75EdE54ced1E8a3C94e',
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

export const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:8080' : ''

export const CHALLENGE_STATUS = ['NotStarted', 'Created', 'Active', 'Finalized'] as const
