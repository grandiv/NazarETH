import { useEffect, useState, useMemo, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { MapContainer, TileLayer, useMap, Polyline } from 'react-leaflet'
import { useLeafletContext } from '@react-leaflet/core'
import L from 'leaflet'
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

const HEX_RADIUS_M = 30
const DEG_PER_M = 0.000009
const HEX_R_LAT = HEX_RADIUS_M * DEG_PER_M
const HEX_R_LNG = HEX_RADIUS_M * DEG_PER_M
const HEX_H = HEX_R_LAT * Math.sqrt(3)

function hexCenter(lat: number, lng: number): [number, number] {
  const row = Math.round(lat / (HEX_H / 2))
  const col = Math.round(lng / (HEX_R_LNG * 1.5))
  const clat = row * (HEX_H / 2)
  const clng = col * (HEX_R_LNG * 1.5)
  return [clat, clng]
}

function hexKey(lat: number, lng: number): string {
  const [clat, clng] = hexCenter(lat, lng)
  return `${clat.toFixed(7)},${clng.toFixed(7)}`
}

function hexVertices(clat: number, clng: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    pts.push([
      clat + HEX_R_LAT * Math.sin(angle),
      clng + HEX_R_LNG * Math.cos(angle),
    ])
  }
  return pts
}

function interpolateRoute(coords: [number, number][], stepM: number): [number, number][] {
  if (coords.length < 2) return coords
  const result: [number, number][] = [coords[0]]
  let carry = 0
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1]
    const [lat2, lng2] = coords[i]
    const dLat = lat2 - lat1
    const dLng = lng2 - lng1
    const dist = Math.sqrt((dLat / DEG_PER_M) ** 2 + (dLng / DEG_PER_M) ** 2)
    if (dist < 0.1) continue
    const steps = Math.ceil((dist - carry) / stepM)
    for (let s = 1; s <= steps; s++) {
      const t = (carry + s * stepM) / dist
      if (t > 1) break
      result.push([lat1 + dLat * t, lng1 + dLng * t])
    }
    carry = carry + steps * stepM - dist
    if (carry < 0) carry = 0
    result.push(coords[i])
  }
  return result
}

function FitBoundsAll({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [30, 30] })
  }, [map, bounds])
  return null
}

const GLOW_COLORS = [
  { fill: '#00ff88', border: '#00ff8866' },
  { fill: '#00ee7c', border: '#00ee7c66' },
  { fill: '#00dd70', border: '#00dd7066' },
  { fill: '#00cc64', border: '#00cc6466' },
  { fill: '#00bb58', border: '#00bb5866' },
  { fill: '#00aa4c', border: '#00aa4c66' },
  { fill: '#009940', border: '#00994066' },
  { fill: '#008834', border: '#00883466' },
]

function HexGridLayer({ grid, maxCount }: { grid: Map<string, number>; maxCount: number }) {
  const context = useLeafletContext()

  const draw = useCallback(() => {
    const map = context.map

    map.eachLayer((layer: any) => {
      if (layer._hexGrid) map.removeLayer(layer)
    })

    const group = L.layerGroup()
    ;(group as any)._hexGrid = true

    grid.forEach((count, key) => {
      const [clat, clng] = key.split(',').map(Number)
      const vertices = hexVertices(clat, clng)
      const idx = maxCount <= 1 ? 0 : Math.min(Math.floor((count / maxCount) * GLOW_COLORS.length), GLOW_COLORS.length - 1)
      const color = GLOW_COLORS[idx]
      L.polygon(vertices as L.LatLngExpression[], {
        color: color.border,
        weight: 1.5,
        fillColor: color.fill,
        fillOpacity: 0.55,
        opacity: 0.7,
      }).addTo(group)
    })

    group.addTo(map)
    return () => { map.removeLayer(group) }
  }, [context, grid, maxCount])

  useEffect(() => {
    const cleanup = draw()
    return cleanup
  }, [draw])

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
    const cells = new Map<string, number>()
    const runActivities = activities.filter(
      a => a.summary_polyline && (a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')
    )

    for (const act of runActivities) {
      const rawCoords = polyline.decode(act.summary_polyline) as [number, number][]
      const coords = interpolateRoute(rawCoords, 15)
      for (const [lat, lng] of coords) {
        const key = hexKey(lat, lng)
        cells.set(key, (cells.get(key) ?? 0) + 1)
      }
    }
    return cells
  }, [activities])

  const totalCells = grid.size
  const maxCount = Math.max(...Array.from(grid.values()), 1)
  const hexAreaKm2 = (Math.sqrt(3) / 2 * (HEX_RADIUS_M * HEX_RADIUS_M)) / 1_000_000
  const totalAreaKm2 = totalCells * hexAreaKm2

  const bounds = useMemo(() => {
    if (grid.size === 0) return null
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
    grid.forEach((_, key) => {
      const [clat, clng] = key.split(',').map(Number)
      minLat = Math.min(minLat, clat - HEX_R_LAT)
      maxLat = Math.max(maxLat, clat + HEX_R_LAT)
      minLng = Math.min(minLng, clng - HEX_R_LNG)
      maxLng = Math.max(maxLng, clng + HEX_R_LNG)
    })
    return [[minLat - 0.001, minLng - 0.002], [maxLat + 0.001, maxLng + 0.002]] as L.LatLngBoundsExpression
  }, [grid])

  if (!isConnected) return (
    <div className="card error-box">Connect your wallet to view territory.</div>
  )

  const runActivities = activities.filter(a => a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ color: 'var(--accent2)', marginBottom: 6 }}>Your Territory</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Every hex you've explored through your runs. Claim more land by completing challenges.
      </p>

      <div className="stat-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Hexes Claimed</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>{totalCells.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Territory Area</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {totalAreaKm2 < 0.01 ? `${(totalAreaKm2 * 1_000_000).toFixed(0)} m²` : totalAreaKm2 < 1 ? `${(totalAreaKm2 * 1000).toFixed(1)}K m²` : `${totalAreaKm2.toFixed(2)} km²`}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Activities</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>{runActivities.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Distance</div>
          <div className="stat-value" style={{ color: '#00ff88' }}>
            {(runActivities.reduce((s, a) => s + a.distance, 0) / 1000).toFixed(1)} km
          </div>
        </div>
      </div>

      {totalCells > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ filter: 'contrast(1.1) saturate(1.2)' }}>
            <MapContainer center={[0, 0]} zoom={15} style={{ height: 520, width: '100%', background: '#080810' }}
              attributionControl={false} zoomControl={true} preferCanvas={true}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <FitBoundsAll bounds={bounds} />
              <HexGridLayer grid={grid} maxCount={maxCount} />
              {runActivities.filter(a => a.summary_polyline).slice(0, 20).map(a => {
                const coords = polyline.decode(a.summary_polyline) as [number, number][]
                if (coords.length < 2) return null
                return (
                  <Polyline
                    key={a.id}
                    positions={coords}
                    pathOptions={{ color: '#FC4C02', weight: 2, opacity: 0.4 }}
                  />
                )
              })}
            </MapContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '12px 16px', background: '#111', borderTop: '1px solid #1a1a2a' }}>
            <span style={{ fontSize: 11, color: '#555' }}>Explored once</span>
            {GLOW_COLORS.map((c, i) => (
              <div key={i} style={{ width: 22, height: 14, borderRadius: 3, background: c.fill, boxShadow: `0 0 6px ${c.fill}44` }} />
            ))}
            <span style={{ fontSize: 11, color: '#555' }}>Explored many</span>
          </div>
        </div>
      ) : (
        <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 32 }}>
          No GPS activities found. Sync from Strava or simulate a run to start claiming territory!
        </div>
      )}

      {runActivities.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--text)' }}>Recent Conquests</h3>
          {runActivities.slice(0, 5).map(a => (
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
