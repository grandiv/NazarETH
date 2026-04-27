import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
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

const HEX_R = 0.00035
const HEX_H = HEX_R * Math.sqrt(3)
const HEX_W = HEX_R * 2

function axialToLatCol(row: number, col: number): [number, number] {
  const lat = row * HEX_H * 0.5
  const lng = col * HEX_W * 0.75
  return [lat, lng]
}

function latLngToAxial(lat: number, lng: number): [number, number] {
  const col = Math.round(lng / (HEX_W * 0.75))
  const row = Math.round(lat / (HEX_H * 0.5))
  return [row, col]
}

function hexVertices(clat: number, clng: number): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    pts.push([
      clat + HEX_R * Math.sin(angle),
      clng + HEX_R * Math.cos(angle),
    ])
  }
  return pts
}

function interpolateRoute(coords: [number, number][], stepDeg: number): [number, number][] {
  if (coords.length < 2) return coords
  const result: [number, number][] = [coords[0]]
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1]
    const [lat2, lng2] = coords[i]
    const dLat = lat2 - lat1
    const dLng = lng2 - lng1
    const dist = Math.sqrt(dLat * dLat + dLng * dLng)
    if (dist < stepDeg * 0.1) continue
    const steps = Math.ceil(dist / stepDeg)
    for (let s = 1; s < steps; s++) {
      const t = s / steps
      result.push([lat1 + dLat * t, lng1 + dLng * t])
    }
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

function TerritoryGridLayer({ claimedCells, maxCount, bounds }: {
  claimedCells: Map<string, number>
  maxCount: number
  bounds: [[number, number], [number, number]] | null
}) {
  const context = useLeafletContext()
  const groupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!bounds) return
    const map = context.map

    if (groupRef.current) {
      map.removeLayer(groupRef.current)
    }

    const group = L.layerGroup()
    ;(group as any)._hexGrid = true
    groupRef.current = group

    const [minLat, minLng] = bounds[0]
    const [maxLat, maxLng] = bounds[1]

    const padLat = (maxLat - minLat) * 0.15
    const padLng = (maxLng - minLng) * 0.15
    const eMinLat = minLat - padLat
    const eMaxLat = maxLat + padLat
    const eMinLng = minLng - padLng
    const eMaxLng = maxLng + padLng

    const startCol = Math.floor(eMinLng / (HEX_W * 0.75)) - 1
    const endCol = Math.ceil(eMaxLng / (HEX_W * 0.75)) + 1
    const startRow = Math.floor(eMinLat / (HEX_H * 0.5)) - 1
    const endRow = Math.ceil(eMaxLat / (HEX_H * 0.5)) + 1

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const [clat, clng] = axialToLatCol(row, col)
        if (clat < eMinLat - HEX_R || clat > eMaxLat + HEX_R) continue
        if (clng < eMinLng - HEX_R || clng > eMaxLng + HEX_R) continue

        const key = `${row},${col}`
        const count = claimedCells.get(key) ?? 0
        const vertices = hexVertices(clat, clng)

        if (count > 0) {
          const idx = maxCount <= 1 ? 0 : Math.min(Math.floor((count / maxCount) * 6), 5)
          const hue = 150 - idx * 8
          const lightness = 55 - idx * 4
          const fill = `hsl(${hue}, 100%, ${lightness}%)`
          const border = `hsla(${hue}, 100%, ${lightness + 15}%, 0.6)`

          L.polygon(vertices as L.LatLngExpression[], {
            color: border,
            weight: 1,
            fillColor: fill,
            fillOpacity: 0.65,
            opacity: 0.5,
          }).addTo(group)
        } else {
          L.polygon(vertices as L.LatLngExpression[], {
            color: 'rgba(0, 255, 136, 0.06)',
            weight: 0.5,
            fillColor: 'rgba(0, 255, 136, 0.02)',
            fillOpacity: 1,
            opacity: 1,
          }).addTo(group)
        }
      }
    }

    group.addTo(map)
    return () => { map.removeLayer(group) }
  }, [context.map, claimedCells, maxCount, bounds])

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

  const { claimedCells, maxCount, bounds } = useMemo(() => {
    const cells = new Map<string, number>()
    const runActs = activities.filter(
      a => a.summary_polyline && (a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')
    )

    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity

    for (const act of runActs) {
      const rawCoords = polyline.decode(act.summary_polyline) as [number, number][]
      const coords = interpolateRoute(rawCoords, HEX_R * 0.5)
      for (const [lat, lng] of coords) {
        const [row, col] = latLngToAxial(lat, lng)
        const key = `${row},${col}`
        cells.set(key, (cells.get(key) ?? 0) + 1)
        const [clat, clng] = axialToLatCol(row, col)
        if (clat < minLat) minLat = clat
        if (clat > maxLat) maxLat = clat
        if (clng < minLng) minLng = clng
        if (clng > maxLng) maxLng = clng
      }
    }

    const max = Math.max(...Array.from(cells.values()), 1)
    let b: [[number, number], [number, number]] | null = null
    if (cells.size > 0) {
      b = [[minLat - 0.001, minLng - 0.002], [maxLat + 0.001, maxLng + 0.002]]
    }
    return { claimedCells: cells, maxCount: max, bounds: b }
  }, [activities])

  const totalCells = claimedCells.size
  const hexAreaM2 = Math.sqrt(3) / 2 * (HEX_R / 0.000009) ** 2
  const totalAreaKm2 = (totalCells * hexAreaM2) / 1_000_000
  const runActivities = activities.filter(a => a.type === 'Run' || a.type === 'Ride' || a.type === 'Swim')

  if (!isConnected) return (
    <div className="card error-box">Connect your wallet to view territory.</div>
  )

  return (
    <div style={{ maxWidth: 900 }}>
      <h2 style={{ color: 'var(--accent2)', marginBottom: 6 }}>Your Territory</h2>
      <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
        Every hex you've explored. Dark cells are unclaimed — run through them to expand your land.
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

      {bounds ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)' }}>
          <MapContainer center={[0, 0]} zoom={15} style={{ height: 520, width: '100%', background: '#080810' }}
            attributionControl={false} zoomControl={true} preferCanvas={true}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <FitBoundsAll bounds={bounds} />
            <TerritoryGridLayer claimedCells={claimedCells} maxCount={maxCount} bounds={bounds} />
            {runActivities.filter(a => a.summary_polyline).slice(0, 20).map(a => {
              const coords = polyline.decode(a.summary_polyline) as [number, number][]
              if (coords.length < 2) return null
              return (
                <Polyline
                  key={a.id}
                  positions={coords}
                  pathOptions={{ color: '#FC4C02', weight: 2, opacity: 0.35 }}
                />
              )
            })}
          </MapContainer>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#111', borderTop: '1px solid #1a1a2a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 18, height: 14, borderRadius: 3, background: 'rgba(0, 255, 136, 0.05)', border: '1px solid rgba(0,255,136,0.1)' }} />
              <span style={{ fontSize: 11, color: '#555' }}>Unclaimed</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {['hsl(150,100%,55%)', 'hsl(142,100%,51%)', 'hsl(134,100%,47%)', 'hsl(126,100%,43%)', 'hsl(118,100%,39%)', 'hsl(110,100%,35%)'].map((c, i) => (
                <div key={i} style={{ width: 20, height: 14, borderRadius: 3, background: c }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#555' }}>Claimed</span>
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
