import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../auth"
import { useApi } from "../api"
import { ConnectButton } from "../components/ConnectButton"
import { StravaConnect } from "../components/StravaConnect"
import { GoalCard } from "../components/GoalCard"

interface MeResponse {
  user: { id: number; wallet_address: string }
  strava_connected: boolean
  hevy_connected: boolean
}

interface GoalResponse {
  id: number
  provider: string
  goal_type: string
  target_value: number
  deadline: number
  stake_amount: string
  actual_value: number
  status: string
  settled: boolean
  contract_id: number | null
}

export function DashboardPage() {
  const { isAuthenticated } = useAuth()
  const { apiFetch } = useApi()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [goals, setGoals] = useState<GoalResponse[]>([])

  useEffect(() => {
    if (!isAuthenticated) return
    apiFetch<MeResponse>("/api/me").then(setMe).catch(console.error)
    apiFetch<GoalResponse[]>("/api/goals").then(setGoals).catch(console.error)
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Connect your wallet to continue</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  const activeGoals = goals.filter(g => g.status === "active")
  const pastGoals = goals.filter(g => g.status !== "active")

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">NazarETH</Link>
        <ConnectButton />
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <Link to="/create" className="btn-primary">+ New Goal</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="card">
            <h3 className="text-sm text-gray-500 mb-2">Fitness Providers</h3>
            <div className="flex gap-3">
              {me?.strava_connected ? (
                <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">Strava Connected</span>
              ) : (
                <StravaConnect />
              )}
              {me?.hevy_connected ? (
                <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm">Hevy Connected</span>
              ) : (
                <span className="px-3 py-1 bg-gray-800 text-gray-500 rounded-full text-sm">Hevy (coming soon)</span>
              )}
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm text-gray-500 mb-2">Stats</h3>
            <div className="flex gap-6">
              <div>
                <div className="text-2xl font-bold">{activeGoals.length}</div>
                <div className="text-xs text-gray-500">Active Goals</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{pastGoals.length}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{goals.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
          </div>
        </div>

        {activeGoals.length > 0 && (
          <section className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
            <div className="grid gap-4">
              {activeGoals.map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          </section>
        )}

        {pastGoals.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold mb-4">Past Goals</h3>
            <div className="grid gap-4">
              {pastGoals.map(g => <GoalCard key={g.id} goal={g} />)}
            </div>
          </section>
        )}

        {goals.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No goals yet. Create your first one!</p>
            <Link to="/create" className="btn-primary">Create Goal</Link>
          </div>
        )}
      </main>
    </div>
  )
}
