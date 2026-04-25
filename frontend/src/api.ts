import { BACKEND_URL } from "./config"
import { useAuth } from "./auth"

export function useApi() {
  const { token } = useAuth()

  async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || "API error")
    }
    return res.json()
  }

  return { apiFetch }
}
