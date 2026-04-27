import { useState } from 'react'

const STEPS = [
  {
    icon: '🔗',
    title: 'Connect Wallet',
    desc: 'Connect your MetaMask or Coinbase Wallet. Make sure you\'re on Base Sepolia testnet.',
  },
  {
    icon: '💧',
    title: 'Get Test USDC',
    desc: 'Head to Dashboard and click "Get 1,000 USDC" to mint free test tokens.',
  },
  {
    icon: '👤',
    title: 'Register',
    desc: 'Link your Strava account via OAuth. This verifies your real fitness data on-chain.',
  },
  {
    icon: '🎯',
    title: 'Create a Challenge',
    desc: 'Set a distance target (e.g. 5 km), duration, and stake amount. Approve USDC and create.',
  },
  {
    icon: '💰',
    title: 'Deposit',
    desc: 'Deposit your staked USDC to activate the challenge. The countdown begins!',
  },
  {
    icon: '🏃',
    title: 'Train & Sync',
    desc: 'Run in real life (or simulate a run). Then hit "Sync from Strava" to update your on-chain progress.',
  },
  {
    icon: '💸',
    title: 'Withdraw Milestones',
    desc: 'Every 10% progress unlocks a milestone withdrawal. Hit 100% to earn it all back.',
  },
  {
    icon: '🗺️',
    title: 'Claim Territory',
    desc: 'View your explored hex-grid territory on the map. Run more to claim more land!',
  },
]

export default function GuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0)
  if (!open) return null

  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(4,11,34,0.85)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'fadeIn .2s ease',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 0, maxWidth: 440, width: '100%',
        maxHeight: '90vh', overflow: 'hidden',
        animation: 'slideDown .2s ease',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px 24px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent2)', margin: 0 }}>How to Use NazarETH</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>Step {step + 1} of {STEPS.length}</p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--surface2)', border: 'none', borderRadius: 8,
            width: 32, height: 32, fontSize: 16, cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ padding: '24px', minHeight: 160 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(5,75,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 16,
          }}>{STEPS[step].icon}</div>
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{STEPS[step].title}</h3>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>{STEPS[step].desc}</p>
        </div>

        <div style={{
          padding: '12px 24px 20px',
          display: 'flex', gap: 10, alignItems: 'center',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{ flex: 1, display: 'flex', gap: 4 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? 'var(--accent)' : 'var(--border)',
                transition: 'background .2s',
              }} />
            ))}
          </div>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 18px', color: 'var(--text2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Back</button>
          )}
          <button onClick={() => {
            if (isLast) { onClose(); setStep(0) } else setStep(step + 1)
          }} style={{
            background: isLast
              ? 'linear-gradient(135deg, var(--success), #00d4aa)'
              : 'linear-gradient(135deg, var(--accent), var(--accent2))',
            border: 'none', borderRadius: 10, padding: '10px 22px',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 2px 12px rgba(5,75,255,0.3)',
          }}>
            {isLast ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
