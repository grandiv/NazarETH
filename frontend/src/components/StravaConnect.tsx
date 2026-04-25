import { BACKEND_URL } from "../config"
import { useAuth } from "../auth"

export function StravaConnect() {
  const { token } = useAuth()

  const handleConnect = async () => {
    const res = await fetch(`${BACKEND_URL}/auth/strava`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    window.location.href = data.url
  }

  return (
    <button onClick={handleConnect} className="btn-primary flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
      </svg>
      Connect Strava
    </button>
  )
}
