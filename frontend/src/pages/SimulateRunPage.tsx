import { useState, useCallback } from 'react'
import { MapContainer, TileLayer, Polyline, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Page } from '../App'
import { BACKEND_URL } from '../lib/contracts'

interface Props { onNavigate: (p: Page) => void }

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const sinDlat = Math.sin(dLat / 2)
  const sinDlon = Math.sin(dLon / 2)
  const h = sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function totalDistance(pts: [number, number][]): number {
  let d = 0
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i])
  return d
}

function formatDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`
}

const RUNNING_SPEED = 2.78

const PRESETS: { name: string; points: [number, number][] }[] = [
  {
    name: 'Central Park Loop (10K)',
    points: [
      [40.7968, -73.9496], [40.7975, -73.9540], [40.7969, -73.9580],
      [40.7930, -73.9620], [40.7880, -73.9615], [40.7830, -73.9590],
      [40.7790, -73.9555], [40.7750, -73.9520], [40.7715, -73.9490],
      [40.7690, -73.9460], [40.7695, -73.9420], [40.7720, -73.9390],
      [40.7760, -73.9370], [40.7800, -73.9390], [40.7840, -73.9410],
      [40.7880, -73.9430], [40.7920, -73.9450], [40.7960, -73.9470],
      [40.7968, -73.9496],
    ],
  },
  {
    name: 'Quick 3K',
    points: [
      [40.7580, -73.9855], [40.7575, -73.9890], [40.7558, -73.9915],
      [40.7540, -73.9900], [40.7530, -73.9870], [40.7540, -73.9840],
      [40.7560, -73.9830], [40.7580, -73.9855],
    ],
  },
  {
    name: 'Riverside 5K',
    points: [
      [40.8050, -73.9680], [40.8020, -73.9710], [40.7985, -73.9740],
      [40.7950, -73.9765], [40.7915, -73.9750], [40.7885, -73.9720],
      [40.7860, -73.9750], [40.7890, -73.9775], [40.7920, -73.9790],
      [40.7960, -73.9770], [40.8000, -73.9740], [40.8035, -73.9710],
      [40.8050, -73.9680],
    ],
  },
]

const CENTER: [number, number] = [40.7831, -73.9712]

function MapClickHandler({ onMapClick }: { onMapClick: (latlng: L.LatLng) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng) },
  })
  return null
}

export default function SimulateRunPage({ onNavigate }: Props) {
  const [points, setPoints] = useState<[number, number][]>([])
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  const dist = totalDistance(points)
  const duration = Math.round(dist / RUNNING_SPEED)
  const paceMin = duration > 0 ? (duration / 60) / (dist / 1000) : 0

  const addPoint = useCallback((latlng: L.LatLng) => {
    setPoints(prev => [...prev, [latlng.lat, latlng.lng]])
  }, [])

  const loadPreset = (preset: typeof PRESETS[number]) => {
    setPoints([...preset.points])
    setMsg('')
  }

  async function handleSubmit() {
    if (points.length < 2) return
    setSubmitting(true)
    setMsg('')
    try {
      const token = localStorage.getItem('nazareth_token')
      if (!token) { setMsg('Sign in first'); setSubmitting(false); return }
      const res = await fetch(`${BACKEND_URL}/api/strava/upload-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points, name: 'NazarETH Simulated Run' }),
      })
      const data = await res.json()
      if (data.activity_id) {
        setMsg(`Activity #${data.activity_id} created! ${formatDist(data.distance_m)} — ${data.pace}`)
      } else {
        setMsg(data.error || 'Upload failed')
      }
    } catch (e: any) {
      setMsg(e.message || 'Error')
    }
    setSubmitting(false)
  }

  return (
    <div style={{ maxWidth: 720 }} className="animate-in">
      <h1 className="section-title" style={{ marginBottom: 6 }}>Simulate Run</h1>
      <p style={{ color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Draw a running route on the map, then upload it to Strava as a real activity.
      </p>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRESETS.map(p => (
          <button key={p.name} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}
            onClick={() => loadPreset(p)}>
            {p.name}
          </button>
        ))}
        {points.length > 0 && (
          <button className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', color: '#f87171' }}
            onClick={() => { setPoints([]); setMsg('') }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <MapContainer center={CENTER} zoom={14} style={{ height: 380, width: '100%' }}
          attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Polyline positions={points} pathOptions={{ color: '#054BFF', weight: 4, opacity: 0.85 }} />
          <MapClickHandler onMapClick={addPoint} />
        </MapContainer>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Click on the map to add points to your route.</p>

      {points.length >= 2 && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--surface), rgba(5,75,255,0.04))',
          border: '1px solid rgba(5,75,255,0.15)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div>
              <div className="stat-label">Distance</div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent2)' }}>{formatDist(dist)}</div>
            </div>
            <div>
              <div className="stat-label">Est. Duration</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</div>
            </div>
            <div>
              <div className="stat-label">Pace</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{Math.floor(paceMin)}:{String(Math.round((paceMin % 1) * 60)).padStart(2, '0')} /km</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            {points.length} waypoints · simulated at ~5:00/km pace
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: 13 }}
            disabled={submitting || points.length < 2}
            onClick={handleSubmit}>
            {submitting ? 'Uploading to Strava...' : 'Upload Run to Strava'}
          </button>
          {msg && (
            <div style={{ marginTop: 10, fontSize: 13, color: msg.includes('created') ? 'var(--success)' : '#f87171' }}>
              {msg}
            </div>
          )}
          {msg.includes('created') && (
            <button className="btn-success" style={{ width: '100%', padding: 13, marginTop: 10 }}
              onClick={() => onNavigate('active')}>
              Sync Progress →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
