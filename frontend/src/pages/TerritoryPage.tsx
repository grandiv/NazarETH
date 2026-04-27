import { useEffect, useState, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { MapContainer, TileLayer, useMap, Polygon, Polyline } from 'react-leaflet'
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

const HEX_R = 0.00045
const HEX_H = HEX_R * Math.sqrt(3)
const HEX_W = HEX_R * 2

function axialCenter(row: number, col: number): [number, number] {
  return [row * HEX_H * 0.5, col * HEX_W * 0.75]
}

function toAxial(lat: number, lng: number): string {
  return `${Math.round(lat / (HEX_H * 0.5))},${Math.round(lng / (HEX_W * 0.75))}`
}

function hexVerts(clat: number, clng: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push([clat + HEX_R * Math.sin(a), clng + HEX_R * Math.cos(a)])
  }
  return pts
}

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => { if (bounds) map.fitBounds(bounds, { padding: [30, 30] }) }, [map, bounds])
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

  const hexData = useMemo(() => {
    const counts = new Map<string, number>()
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    const runs = activities.filter(a => a.summary_polyline && (a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim'))

    for (const act of runs) {
      const pts = polyline.decode(act.summary_polyline) as [number, number][]
      for (const [lat, lng] of pts) {
        const k = toAxial(lat, lng)
        counts.set(k, (counts.get(k) ?? 0) + 1)
        const [r, c] = k.split(',').map(Number)
        const [cl, cn] = axialCenter(r, c)
        if (cl < minLat) minLat = cl
        if (cl > maxLat) maxLat = cl
        if (cn < minLng) minLng = cn
        if (cn > maxLng) maxLng = cn
      }
    }

    const maxCount = Math.max(...Array.from(counts.values()), 1)
    type HexInfo = { key: string; verts: [number, number][]; color: string; border: string }
    const hexes: HexInfo[] = []

    counts.forEach((count, key) => {
      const [row, col] = key.split(',').map(Number)
      const [clat, clng] = axialCenter(row, col)
      const idx = maxCount <= 1 ? 0 : Math.min(Math.floor((count / maxCount) * 6), 5)
      const hue = 150 - idx * 8
      const lit = 55 - idx * 4
      hexes.push({
        key,
        verts: hexVerts(clat, clng),
        color: `hsl(${hue}, 100%, ${lit}%)`,
        border: `hsla(${hue}, 100%, ${lit + 20}%, 0.5)`,
      })
    })

    const bounds = hexes.length > 0
      ? [[minLat - 0.001, minLng - 0.002], [maxLat + 0.001, maxLng + 0.002]] as L.LatLngBoundsExpression
      : null

    return { hexes, bounds }
  }, [activities])

  const totalCells = hexData.hexes.length
  const hexAreaM2 = Math.sqrt(3) / 2 * (HEX_R / 0.000009) ** 2
  const totalAreaKm2 = (totalCells * hexAreaM2) / 1e6
  const runs = activities.filter(a => a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')

  if (!isConnected) return <div className="card error-box">Connect your wallet to view territory.</div>

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ color: 'var(--accent2)', marginBottom: 6 }}>Your Territory</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Every hex you've explored. Claim more land by running further.
      </p>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Hexes Claimed</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>{totalCells.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Territory Area</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {totalAreaKm2 < 0.01 ? `${(totalAreaKm2 * 1e6).toFixed(0)} m²` : totalAreaKm2 < 1 ? `${(totalAreaKm2 * 1e3).toFixed(1)}K m²` : `${totalAreaKm2.toFixed(2)} km²`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Activities</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>{runs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Distance</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {(runs.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1)} km
          </div>
        </div>
      </div>

      {hexData.bounds && hexData.hexes.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)' }}>
          <MapContainer center={[0, 0]} zoom={15}
            style={{ height: 520, width: '100%', background: '#080810' }}
            attributionControl={false} zoomControl={true}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FitBounds bounds={hexData.bounds} />
            {hexData.hexes.map(h => (
              <Polygon key={h.key} positions={h.verts}
                pathOptions={{ color: h.border, weight: 1.2, fillColor: h.color, fillOpacity: 0.7, opacity: 0.6 }} />
            ))}
            {runs.filter(a => a.summary_polyline).slice(0, 15).map(a => {
              const coords = polyline.decode(a.summary_polyline) as [number, number][]
              if (coords.length < 2) return null
              return <Polyline key={a.id} positions={coords}
                pathOptions={{ color: '#FC4C02', weight: 1.5, opacity: 0.3 }} />
            })}
          </MapContainer>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#111', borderTop: '1px solid #1a1a2a' }}>
            <span style={{ fontSize: 11, color: '#555' }}>Explored once</span>
            {['hsl(150,100%,55%)','hsl(142,100%,51%)','hsl(134,100%,47%)','hsl(126,100%,43%)','hsl(118,100%,39%)','hsl(110,100%,35%)'].map((c, i) => (
              <div key={i} style={{ width: 20, height: 12, borderRadius: 3, background: c }} />
            ))}
            <span style={{ fontSize: 11, color: '#555' }}>Many visits</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
          No GPS activities found. Sync from Strava or simulate a run to start claiming territory!
        </div>
      )}

      {runs.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>Recent Conquests</h3>
          {runs.slice(0, 5).map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(a.start_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#00ff88', fontWeight: 600 }}>{(a.distance / 1000).toFixed(2)} km</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
