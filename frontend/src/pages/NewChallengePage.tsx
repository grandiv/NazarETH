import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import type { Page } from '../App'
import { ADDRESSES, NazarChallengeAbi, MockUSDAbi, parseUSDC, ACTIVITY_TYPES } from '../lib/contracts'

interface Props { onNavigate: (p: Page) => void }

const PRESETS = [
  { label: 'Quick 3K', km: '3', mins: '5', stake: '5', icon: '🏃' },
  { label: '5K Run', km: '5', mins: '5', stake: '10', icon: '🏅' },
  { label: '10K Challenge', km: '10', mins: '10', stake: '20', icon: '🏆' },
]

export default function NewChallengePage({ onNavigate }: Props) {
  const { address, isConnected } = useAccount()
  const [step, setStep] = useState<'approve' | 'create'>('approve')

  const [targetKm, setTargetKm] = useState('5')
  const [durationMins, setDurationMins] = useState('5')
  const [stakeAmount, setStakeAmount] = useState('10')

  const targetMeters = BigInt(Math.round(Number(targetKm) * 1000))
  const stakeRaw = parseUSDC(stakeAmount || '0')
  const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(durationMins) * 60)

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ADDRESSES.MockUSDC,
    abi: MockUSDAbi,
    functionName: 'allowance',
    args: [address as `0x${string}`, ADDRESSES.NazarChallenge],
    query: { enabled: !!address },
  })

  const needsApproval = !allowance || (allowance as bigint) < stakeRaw

  const { writeContract: approve, data: approveTx, isPending: approving, error: approveErr } = useWriteContract()
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveTx,
    query: { enabled: !!approveTx },
  })

  useEffect(() => { if (approveSuccess && step === 'approve') { refetchAllowance(); setStep('create') } }, [approveSuccess, step, refetchAllowance])

  const { writeContract: create, data: createTx, isPending: creating, error: createErr } = useWriteContract()
  const { isSuccess: createSuccess } = useWaitForTransactionReceipt({
    hash: createTx,
    query: { enabled: !!createTx },
  })

  if (!isConnected) {
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--muted)' }}>Connect your wallet first.</p>
      </div>
    )
  }

  if (createSuccess) {
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(252,76,2,0.15), rgba(255,126,58,0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28,
        }}>🏆</div>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Challenge Created!</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
          Now deposit your USDC to activate it.
        </p>
        <button className="btn-primary" onClick={() => onNavigate('active')}>
          Go to My Challenge →
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 540 }} className="animate-in">
      <h1 className="section-title" style={{ marginBottom: 6 }}>New Challenge</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 20, lineHeight: 1.6 }}>
        Stake USDC on a running goal. Hit it to earn back — miss it and lose the unearned portion.
      </p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Quick Presets</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PRESETS.map(p => {
              const active = targetKm === p.km && durationMins === p.mins && stakeAmount === p.stake
              return (
                <button key={p.label} onClick={() => { setTargetKm(p.km); setDurationMins(p.mins); setStakeAmount(p.stake) }}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                    border: active ? '2px solid var(--strava)' : '1px solid var(--border)',
                    background: active ? 'rgba(252,76,2,0.08)' : 'var(--bg)',
                    color: active ? 'var(--accent2)' : 'var(--muted)',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{p.icon}</div>
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Target Distance (km)</label>
          <input type="number" min="0.5" step="0.5" value={targetKm}
            onChange={e => setTargetKm(e.target.value)} />
          <span className="form-hint">{Number(targetKm).toLocaleString()} km total during the challenge period.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Duration (minutes)</label>
          <input type="number" min="3" value={durationMins}
            onChange={e => setDurationMins(e.target.value)} />
          <span className="form-hint">Min 3 min for demo. After deadline, 2 min grace before finalizing.</span>
        </div>

        <div className="form-group">
          <label className="form-label">Stake Amount (USDC)</label>
          <input type="number" min="1" step="1" value={stakeAmount}
            onChange={e => setStakeAmount(e.target.value)} />
          <span className="form-hint">Min 1 USDC. Unearned portion is slashed if you miss the goal.</span>
        </div>

        <hr className="divider" />

        <div style={{
          background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 18,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <div>
            <div className="stat-label">You stake</div>
            <div style={{ fontWeight: 700, color: 'var(--accent2)' }}>{stakeAmount} USDC</div>
          </div>
          <div>
            <div className="stat-label">Duration</div>
            <div style={{ fontWeight: 700 }}>{durationMins} min</div>
          </div>
          <div>
            <div className="stat-label">Target</div>
            <div style={{ fontWeight: 700 }}>{Number(targetKm).toLocaleString()} km</div>
          </div>
          <div>
            <div className="stat-label">Per milestone</div>
            <div style={{ fontWeight: 700 }}>{(Number(stakeAmount) / 10).toFixed(1)} USDC (10%)</div>
          </div>
        </div>

        {(approveErr || createErr) && (
          <div className="error-box" style={{ marginBottom: 12 }}>
            {((approveErr || createErr) as any)?.shortMessage ?? (approveErr || createErr)?.message}
          </div>
        )}

        {needsApproval && step === 'approve' && (
          <button className="btn-primary" style={{ width: '100%', padding: 13 }} disabled={approving}
            onClick={() => approve({
              address: ADDRESSES.MockUSDC, abi: MockUSDAbi,
              functionName: 'approve',
              args: [ADDRESSES.NazarChallenge, stakeRaw * 10n],
              chainId: baseSepolia.id,
            })}>
            {approving ? 'Confirm in wallet...' : `1. Approve ${stakeAmount} USDC`}
          </button>
        )}

        {(!needsApproval || step === 'create') && (
          <button className="btn-success" style={{ width: '100%', padding: 13 }} disabled={creating}
            onClick={() => create({
              address: ADDRESSES.NazarChallenge, abi: NazarChallengeAbi,
              functionName: 'createChallenge',
              args: [
                ACTIVITY_TYPES.running as `0x${string}`,
                targetMeters,
                deadline,
                stakeRaw,
              ],
              chainId: baseSepolia.id,
            })}>
            {creating ? 'Confirm in wallet...' : '2. Create Challenge'}
          </button>
        )}
      </div>
    </div>
  )
}
