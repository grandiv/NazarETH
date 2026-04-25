import { useState } from 'react'
import { useAccount, useSignMessage, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import type { Page } from '../App'
import { ADDRESSES, NazarRegistryAbi, BACKEND_URL } from '../lib/contracts'

interface Props { onNavigate: (p: Page) => void }

export default function RegisterPage({ onNavigate }: Props) {
  const { address, isConnected } = useAccount()
  const [stravaId, setStravaId] = useState('')
  const [stravaFlow, setStravaFlow] = useState(false)
  const [stravaAthleteId, setStravaAthleteId] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const { signMessageAsync } = useSignMessage()

  const { data: isRegistered, refetch } = useReadContract({
    address: ADDRESSES.NazarRegistry,
    abi: NazarRegistryAbi,
    functionName: 'isRegistered',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  })

  const { data: nonce, refetch: refetchNonce } = useReadContract({
    address: ADDRESSES.NazarRegistry,
    abi: NazarRegistryAbi,
    functionName: 'nonces',
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  })

  async function handleStravaConnect() {
    if (!address) return
    setErr('')
    try {
      const nonceRes = await fetch(`${BACKEND_URL}/auth/nonce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      })
      const { message } = await nonceRes.json()
      const signature = await signMessageAsync({ message })

      const verifyRes = await fetch(`${BACKEND_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })
      const { token } = await verifyRes.json()
      if (!token) { setErr('Login failed'); return }
      localStorage.setItem('nazareth_token', token)

      const stravaRes = await fetch(`${BACKEND_URL}/auth/strava`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const stravaData = await stravaRes.json()
      if (stravaData.url) {
        window.location.href = stravaData.url
      } else {
        setErr(stravaData.error || 'Strava connect failed')
      }
    } catch (e: any) {
      setErr(e.message || 'Error connecting Strava')
    }
  }

  async function handleStravaRegister() {
    if (!address || !stravaAthleteId) return
    setErr('')
    setLoading(true)
    try {
      const token = localStorage.getItem('nazareth_token')
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
      const currentNonce = (nonce as bigint | undefined) ?? 0n

      const signRes = await fetch(`${BACKEND_URL}/api/registry/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          wallet: address,
          strava_athlete_id: BigInt(stravaAthleteId).toString(),
          nonce: currentNonce.toString(),
          deadline: deadline.toString(),
        }),
      })
      const signData = await signRes.json()
      if (!signData.signature) { setErr(signData.error || 'Signing failed'); setLoading(false); return }

      writeContract({
        address: ADDRESSES.NazarRegistry,
        abi: NazarRegistryAbi,
        functionName: 'register',
        args: [BigInt(stravaAthleteId), deadline, signData.signature as `0x${string}`],
        chainId: baseSepolia.id,
      })
    } catch (e: any) {
      setErr(e.message || 'Registration failed')
      setLoading(false)
    }
  }

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  })

  function handleRegister() {
    if (!stravaId || !address) return
    writeContract({
      address: ADDRESSES.NazarRegistry,
      abi: NazarRegistryAbi,
      functionName: 'devRegister',
      args: [BigInt(stravaId)],
      chainId: baseSepolia.id,
    })
  }

  if (isSuccess) {
    refetch()
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--success-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28,
        }}>✓</div>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Registered!</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 }}>
          Strava ID <strong>{stravaId}</strong> is now linked to your wallet.
        </p>
        <button className="btn-primary" onClick={() => onNavigate('new-challenge')}>
          Create a Challenge →
        </button>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--muted)' }}>Connect your wallet to register.</p>
      </div>
    )
  }

  if (isRegistered) {
    return (
      <div className="card animate-in" style={{ textAlign: 'center', padding: 48 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'var(--success-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 28,
        }}>✓</div>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Already Registered</h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Your wallet is linked to a Strava account.</p>
        <button className="btn-secondary" onClick={() => onNavigate('dashboard')}>
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480 }} className="animate-in">
      <h1 className="section-title" style={{ marginBottom: 6 }}>Register</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
        Link your wallet to a Strava athlete ID.
      </p>

      {!stravaFlow ? (
        <div className="card">
          <button
            className="btn-primary"
            style={{ width: '100%', padding: 13, marginBottom: 16 }}
            onClick={handleStravaConnect}
            disabled={!address}
          >
            Connect with Strava (OAuth)
          </button>

          <div style={{ textAlign: 'center', color: 'var(--muted)', margin: '12px 0', fontSize: 13 }}>or</div>

          <button
            className="btn-secondary"
            style={{ width: '100%', padding: 13, marginBottom: 16 }}
            onClick={() => setStravaFlow(true)}
          >
            devRegister (devnet only)
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Strava Athlete ID</label>
            <input
              type="number"
              placeholder="e.g. 12345678"
              value={stravaId}
              onChange={e => setStravaId(e.target.value)}
            />
            <span className="form-hint">Any number works on devnet.</span>
          </div>

          {(error || err) && (
            <div className="error-box" style={{ marginBottom: 12 }}>
              {(error as any)?.shortMessage ?? err ?? error?.message}
            </div>
          )}

          <button
            className="btn-primary"
            style={{ width: '100%', padding: 13 }}
            disabled={!stravaId || isPending || isConfirming}
            onClick={handleRegister}
          >
            {isPending ? 'Confirm in wallet...' : isConfirming ? 'Confirming...' : 'Register (devMode)'}
          </button>
        </div>
      )}
    </div>
  )
}
