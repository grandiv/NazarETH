import { Link } from "react-router-dom"

interface Goal {
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

export function GoalCard({ goal }: { goal: Goal }) {
  const progress = goal.target_value > 0 ? Math.min(100, Math.round((goal.actual_value / goal.target_value) * 100)) : 0
  const deadlineDate = new Date(goal.deadline * 1000)
  const isExpired = Date.now() > goal.deadline * 1000
  const statusColor =
    goal.status === "achieved" ? "text-green-400" :
    goal.status === "failed" ? "text-red-400" :
    isExpired ? "text-yellow-400" : "text-blue-400"

  const statusLabel =
    goal.status === "achieved" ? "Achieved" :
    goal.status === "failed" ? "Failed" :
    goal.status === "claimed" ? "Claimed" :
    isExpired ? "Settleable" : "Active"

  const targetLabel = goal.goal_type === "distance"
    ? `${(goal.target_value / 1000).toFixed(1)} km`
    : `${goal.target_value} workouts`

  const actualLabel = goal.goal_type === "distance"
    ? `${(goal.actual_value / 1000).toFixed(2)} km`
    : `${goal.actual_value}`

  return (
    <Link to={`/goal/${goal.id}`} className="block">
      <div className="card hover:border-blue-500/50 transition-colors">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="text-xs uppercase tracking-wide text-gray-500">{goal.provider}</span>
            <h3 className="text-lg font-semibold">{targetLabel}</h3>
          </div>
          <span className={`text-sm font-medium ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">{actualLabel}</span>
            <span className="text-gray-400">{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex justify-between text-sm text-gray-500">
          <span>Stake: {Number(goal.stake_amount) > 0 ? `${(Number(goal.stake_amount) / 1e6).toFixed(2)} USDC` : "Not deposited"}</span>
          <span>{deadlineDate.toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}
