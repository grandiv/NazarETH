import { useEffect, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { MapContainer, TileLayer, Rectangle, useMap, Polyline } from 'react-leaflet'
import polyline from '@mapbox/polyline'
import 'leaflet/dist/leaflet.css'
import { BACKEND_URL } from '../lib/contracts'

interface StravaActivity {
  id: number
  name: string
  distance: number
  type: string
  start_date: string
  summary_polyline: string
}

const CELL_SIZE_M = 100
const DEG_PER_M = 0.000009
const CELL_DEG = CELL_SIZE_M * DEG_PER_M

function cellKey(lat: number, lng: number): string {
  const cl = Math.floor(lat / CELL_DEG)
  const cg = Math.floor(lng / CELL_DEG)
  return `${cl},${cg}`
}

function cellBounds(key: string): [[number, number], [number, number]] {
  const [cl, cg] = key.split(',').map(Number)
  return [
    [cl * CELL_DEG, cg * CELL_DEG],
    [(cl + 1) * CELL_DEG, (cg + 1) * CELL_DEG],
  ]
}

const COLORS = [
  '#00ff88',
  '#00e87a',
  '#00d06c',
  '#00b85e',
  '#00a050',
  '#009944',
  '#008838',
  '#007730',
]

function getCellColor(count: number, maxCount: number): string {
  if (maxCount <= 1) return COLORS[0]
  const idx = Math.min(Math.floor((count / maxCount) * COLORS.length), COLORS.length - 1)
  return COLORS[idx]
}

function FitBoundsAll({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [20, 20] })
  }, [map, bounds])
  return null
}

export default function TerritoryPage() {
  const { isConnected } = useAccount()
  const [activities, setActivities] = useState<StravaActivity[]>([])

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

  const grid = useMemo(() => {
    const cells = new Map<string, { count: number; activityIds: Set<number> }>()
    const runActivities = activities.filter(
      a => a.summary_polyline && (a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')
    )

    for (const act of runActivities) {
      const coords = polyline.decode(act.summary_polyline) as [number, number][]
      for (const [lat, lng] of coords) {
        const key = cellKey(lat, lng)
        const existing = cells.get(key)
        if (existing) {
          existing.count++
          existing.activityIds.add(act.id)
        } else {
          cells.set(key, { count: 1, activityIds: new Set([act.id]) })
        }
      }
    }
    return cells
  }, [activities])

  const totalCells = grid.size
  const maxCount = Math.max(...Array.from(grid.values()).map(c => c.count), 1)
  const totalAreaKm2 = (totalCells * CELL_SIZE_M * CELL_SIZE_M) / 1_000_000

  const bounds = useMemo(() => {
    if (grid.size === 0) return null
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    for (const key of grid.keys()) {
      const b = cellBounds(key)
      minLat = Math.min(minLat, b[0][0])
      maxLat = Math.max(maxLat, b[1][0])
      minLng = Math.min(minLng, b[0][1])
      maxLng = Math.max(maxLng, b[1][1])
    }
    return [[minLat - 0.002, minLng - 0.002], [maxLat + 0.002, maxLng + 0.002]] as [[number, number], [number, number]]
  }, [grid])

  if (!isConnected) return (
    <div className="card error-box">Connect your wallet to view territory.</div>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ color: 'var(--accent2)', marginBottom: 6 }}>Your Territory</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Every block you've explored through your runs. Claim more land by completing challenges.
      </p>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Blocks Claimed</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>{totalCells.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Territory Area</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {totalAreaKm2 < 1 ? `${(totalAreaKm2 * 1_000_000).toFixed(0)} m²` : `${totalAreaKm2.toFixed(2)} km²`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Activities Mapped</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {activities.filter(a => a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Distance</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {(activities.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1)} km
          </div>
        </div>
      </div>

      {totalCells > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)' }}>
          <MapContainer center={[0, 0]} zoom={14} style={{ height: 500, width: '100%', background: '#0a0a0a' }}
            attributionControl={false} zoomControl={true}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FitBoundsAll bounds={bounds} />
            {Array.from(grid.entries()).map(([key, { count }]) => {
              const b = cellBounds(key)
              return (
                <Rectangle
                  key={key}
                  bounds={b}
                  pathOptions={{
                    color: 'transparent',
                    fillColor: getCellColor(count, maxCount),
                    fillOpacity: 0.7,
                    weight: 0,
                  }}
                />
              )
            })}
            {activities.filter(a => a.summary_polyline && (a.type === 'Run' || a.type === 'Ride')).slice(0, 20).map(a => {
              const coords = polyline.decode(a.summary_polyline) as [number, number][]
              if (coords.length < 2) return null
              return (
                <Polyline
                  key={a.id}
                  positions={coords}
                  pathOptions={{ color: '#FC4C02', weight: 1.5, opacity: 0.3 }}
                />
              )
            })}
          </MapContainer>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#111', borderTop: '1px solid #222' }}>
            <span style={{ fontSize: 11, color: '#666' }}>Less</span>
            {COLORS.map((c, i) => (
              <div key={i} style={{ width: 20, height: 12, borderRadius: 2, background: c }} />
            ))}
            <span style={{ fontSize: 11, color: '#666' }}>More visits</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
          No GPS activities found. Sync from Strava or simulate a run to start claiming territory!
        </div>
      )}

      {totalCells > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>Recent Conquests</h3>
          {activities.filter(a => a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim').slice(0, 5).map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(a.start_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#00ff88', fontWeight: 600 }}>
                {(a.distance / 1000).toFixed(2)} km
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
