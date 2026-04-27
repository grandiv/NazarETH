import { useEffect, useState } from 'react'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet'
import polyline from '@mapbox/polyline'
import 'leaflet/dist/leaflet.css'
import {
  ADDRESSES, NazarChallengeAbi, NazarOracleAbi, ACTIVITY_TYPES,
  formatUSDC, formatDeadline, CHALLENGE_STATUS, BACKEND_URL,
} from '../lib/contracts'

const ACTIVITY_LABEL: Record<string, string> = {
  [ACTIVITY_TYPES.running]:  '🏃 Running',
  [ACTIVITY_TYPES.cycling]:  '🚴 Cycling',
  [ACTIVITY_TYPES.swimming]: '🏊 Swimming',
}

const BPS = 10_000n
const CONTRACT = { address: ADDRESSES.NazarChallenge as `0x${string}`, abi: NazarChallengeAbi as any }
const ORACLE = { address: ADDRESSES.NazarOracle as `0x${string}`, abi: NazarOracleAbi as any }

interface StravaActivity {
  id: number
  name: string
  distance: number
  type: string
  start_date: string
  summary_polyline: string
}

function MiniMap({ encodedPolyline }: { encodedPolyline: string }) {
  const coords = polyline.decode(encodedPolyline) as [number, number][]
  if (coords.length < 2) return null

  const center: [number, number] = coords[Math.floor(coords.length / 2)]

  return (
    <MapContainer center={center} zoom={13} style={{ height: 140, width: '100%', borderRadius: 8 }}
      attributionControl={false} zoomControl={false} dragging={false} scrollWheelZoom={false}
      doubleClickZoom={false} touchZoom={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={coords} pathOptions={{ color: '#FC4C02', weight: 3, opacity: 0.9 }} />
      <FitBounds coords={coords} />
    </MapContainer>
  )
}

function FitBounds({ coords }: { coords: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (coords.length >= 2) {
      map.fitBounds(coords, { padding: [8, 8] })
    }
  }, [map, coords])
  return null
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount()
  const [activities, setActivities] = useState<StravaActivity[]>([])
  const [showTracks, setShowTracks] = useState<Record<string, boolean>>({})

  const { data: counter } = useReadContract({
    ...CONTRACT,
    functionName: 'challengeCounter',
  })

  const total = Number(counter ?? 0n)

  const { data: allChallenges, isLoading } = useReadContracts({
    contracts: Array.from({ length: total }, (_, i) => ({
      ...CONTRACT,
      functionName: 'getChallenge',
      args: [BigInt(i + 1)],
    })),
    query: { enabled: total > 0 },
  })

  const { data: allProgress } = useReadContracts({
    contracts: Array.from({ length: total }, (_, i) => ({
      ...ORACLE,
      functionName: 'getProgressBps',
      args: [address as `0x${string}`, BigInt(i + 1)],
    })),
    query: { enabled: total > 0 && !!address },
  })

  useEffect(() => {
    const token = localStorage.getItem('nazareth_token')
    if (!token) return
    fetch(`${BACKEND_URL}/api/strava/activities`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: StravaActivity[]) => setActivities(data))
      .catch(() => {})
  }, [])

  function getActivitiesForChallenge(d: any) {
    const deadline = Number(d.deadline as bigint)
    const createdEstimate = deadline - 7 * 24 * 3600
    return activities.filter(a => {
      const t = new Date(a.start_date).getTime() / 1000
      return t >= createdEstimate && t <= deadline && (a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')
    }).slice(0, 5)
  }

  if (!isConnected) return (
    <div className="card error-box">Connect your wallet to view challenges.</div>
  )

  if (isLoading || (total > 0 && !allChallenges)) return (
    <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
      Loading challenges…
    </div>
  )

  const mine = (allChallenges ?? [])
    .map((r, i) => ({
      id: BigInt(i + 1),
      data: r?.result as any,
      progressBps: (allProgress?.[i]?.result ?? 0n) as bigint,
    }))
    .filter(({ data }) => data && (data.challenger as string).toLowerCase() === address?.toLowerCase())
    .reverse()

  const totalStaked  = mine.reduce((s, { data: d }) => s + (d.stakeAmount as bigint), 0n)
  const totalClaimed = mine.reduce((s, { data: d }) => s + (d.stakeAmount as bigint) * (d.withdrawnBps as bigint) / BPS, 0n)
  const totalLost    = totalStaked - totalClaimed

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ color: 'var(--accent2)', marginBottom: 20 }}>All Challenges</h2>

      {total === 0 && (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
          No challenges found on-chain yet.
        </div>
      )}

      {total > 0 && mine.length === 0 && (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
          No challenges found for this wallet.
        </div>
      )}

      {mine.length > 0 && (
        <div className="stat-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total Challenges</div>
            <div className="stat-value">{mine.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Staked</div>
            <div className="stat-value">{formatUSDC(totalStaked)} <span style={{ fontSize: 13, color: 'var(--muted)' }}>USDC</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Claimed Back</div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{formatUSDC(totalClaimed)} <span style={{ fontSize: 13, color: 'var(--muted)' }}>USDC</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Lost (Penalty)</div>
            <div className="stat-value" style={{ color: totalLost > 0n ? '#f87171' : 'var(--muted)' }}>{formatUSDC(totalLost)} <span style={{ fontSize: 13, color: 'var(--muted)' }}>USDC</span></div>
          </div>
        </div>
      )}

      {mine.map(({ id, data: d, progressBps }) => {
        const stakeAmount  = d.stakeAmount  as bigint
        const withdrawnBps = d.withdrawnBps as bigint
        const targetValue  = d.targetValue  as bigint
        const status       = Number(d.status)
        const claimed      = stakeAmount * withdrawnBps / BPS
        const lost         = stakeAmount - claimed
        const achievedDist = targetValue * progressBps / BPS
        const targetKm     = (Number(targetValue) / 1000).toFixed(1)
        const achievedKm   = (Number(achievedDist) / 1000).toFixed(2)
        const pct          = Number(progressBps) / 100
        const isFinalized  = status === 3
        const isActive     = status === 2
        const actType      = (d.activityType as string).toLowerCase()
        const key          = String(id)

        const challengeActivities = getActivitiesForChallenge(d)

        const statusColor = isFinalized
          ? (lost === 0n ? '#4ade80' : '#f87171')
          : isActive ? '#fbbf24' : 'var(--muted)'

        const resultLabel = isFinalized
          ? (lost === 0n ? '✓ Completed' : '✗ Penalized')
          : CHALLENGE_STATUS[status] ?? 'Unknown'

        return (
          <div key={key} className="card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <strong style={{ fontSize: 15 }}>
                Challenge #{key}
                <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--muted)' }}>
                  {ACTIVITY_LABEL[actType] ?? '🏅 Activity'}
                </span>
              </strong>
              <span style={{
                marginLeft: 'auto', fontSize: 13, fontWeight: 600,
                padding: '2px 10px', borderRadius: 12,
                background: statusColor + '22', color: statusColor,
                border: `1px solid ${statusColor}55`,
              }}>
                {resultLabel}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
              <div>Target: <strong style={{ color: 'var(--text)' }}>{targetKm} km</strong></div>
              <div>Deadline: <strong style={{ color: 'var(--text)' }}>{formatDeadline(d.deadline as bigint)}</strong></div>
            </div>

            <div style={{ background: 'var(--border)', borderRadius: 6, height: 10, marginBottom: 12, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, pct)}%`,
                background: progressBps >= 10000n
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #FC4C02, #ff7e3a)',
                transition: 'width .3s',
                borderRadius: 6,
              }} />
              <span style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                fontSize: 11, fontWeight: 700, color: progressBps >= 10000n ? '#fff' : 'var(--text)',
              }}>
                {achievedKm} / {targetKm} km
              </span>
            </div>

            <div className="stat-grid">
              <div>
                <div className="stat-label">Staked</div>
                <div style={{ fontWeight: 700 }}>{formatUSDC(stakeAmount)} USDC</div>
              </div>
              <div>
                <div className="stat-label">Progress</div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>{pct.toFixed(0)}%</div>
              </div>
              <div>
                <div className="stat-label">Claimed back</div>
                <div style={{ fontWeight: 700, color: '#4ade80' }}>{formatUSDC(claimed)} USDC</div>
              </div>
              <div>
                <div className="stat-label">{isActive ? 'At risk' : 'Lost'}</div>
                <div style={{ fontWeight: 700, color: lost > 0n ? '#f87171' : 'var(--muted)' }}>
                  {formatUSDC(lost)} USDC
                </div>
              </div>
            </div>

            {challengeActivities.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', marginBottom: 8 }}
                  onClick={() => setShowTracks(prev => ({ ...prev, [key]: !prev[key] }))}>
                  {showTracks[key] ? 'Hide Routes' : `Show ${challengeActivities.length} Route(s)`}
                </button>
                {showTracks[key] && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    {challengeActivities.map(a => (
                      <div key={a.id}>
                        <MiniMap encodedPolyline={a.summary_polyline} />
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, textAlign: 'center' }}>
                          {a.name} · {(a.distance / 1000).toFixed(2)} km
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
