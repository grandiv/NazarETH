import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { useAuth } from "../auth"
import { useApi } from "../api"
import { CONTRACT_ADDRESS } from "../config"
import { GOAL_VAULT_ABI } from "../abi"
import { ConnectButton } from "../components/ConnectButton"

interface GoalData {
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

interface ProgressData {
  goal_id: number
  target_value: number
  actual_value: number
  progress_pct: number
  time_remaining_seconds: number
}

interface SettleData {
  goal_id: number
  actual_value: number
  timestamp: number
  signature: string
  status: string
}

export function GoalDetailPage() {
  const { id } = useParams()
  const { isAuthenticated } = useAuth()
  const { apiFetch } = useApi()
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  const { writeContract: settle, data: settleHash } = useWriteContract()
  const { isSuccess: settleConfirmed } = useWaitForTransactionReceipt({ hash: settleHash })
  const { writeContract: claim, data: claimHash } = useWriteContract()
  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash })

  useEffect(() => {
    if (!isAuthenticated || !id) return
    Promise.all([
      apiFetch<GoalData>(`/api/goals/${id}`),
      apiFetch<ProgressData>(`/api/goals/${id}/progress`),
    ]).then(([g, p]) => {
      setGoal(g)
      setProgress(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [isAuthenticated, id])

  const handleSettle = async () => {
    if (!id || !goal) return
    const data = await apiFetch<SettleData>(`/api/goals/${id}/settle`, { method: "POST" })
    if (goal.contract_id != null) {
      settle({
        address: CONTRACT_ADDRESS,
        abi: GOAL_VAULT_ABI,
        functionName: "settleGoal",
        args: [BigInt(data.goal_id), BigInt(data.actual_value), BigInt(data.timestamp), data.signature as `0x${string}`],
      })
    }
  }

  const handleClaim = () => {
    if (goal?.contract_id == null) return
    claim({
      address: CONTRACT_ADDRESS,
      abi: GOAL_VAULT_ABI,
      functionName: "claimBack",
      args: [BigInt(goal.contract_id)],
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center"><ConnectButton /></div>
      </div>
    )
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  }

  if (!goal) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Goal not found</div>
  }

  const isExpired = Date.now() > goal.deadline * 1000
  const targetLabel = goal.goal_type === "distance"
    ? `${(goal.target_value / 1000).toFixed(1)} km`
    : `${goal.target_value} workouts`
  const actualLabel = goal.goal_type === "distance"
    ? `${(goal.actual_value / 1000).toFixed(2)} km`
    : `${goal.actual_value}`
  const pct = progress?.progress_pct ?? 0
  const remaining = progress?.time_remaining_seconds ?? 0
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-gray-400 hover:text-white">&larr; Dashboard</Link>
        <ConnectButton />
      </nav>

      <main className="max-w-lg mx-auto px-6 py-8">
        <div className="card mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs uppercase tracking-wide text-gray-500">{goal.provider}</span>
              <h2 className="text-2xl font-bold">{targetLabel}</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              goal.status === "achieved" ? "bg-green-900/30 text-green-400" :
              goal.status === "failed" ? "bg-red-900/30 text-red-400" :
              "bg-blue-900/30 text-blue-400"
            }`}>
              {goal.status}
            </span>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{actualLabel}</span>
              <span>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Stake</span>
              <div className="font-medium">{Number(goal.stake_amount) > 0 ? `${(Number(goal.stake_amount) / 1e6).toFixed(2)} USDC` : "Not deposited"}</div>
            </div>
            <div>
              <span className="text-gray-500">Deadline</span>
              <div className="font-medium">{new Date(goal.deadline * 1000).toLocaleDateString()}</div>
            </div>
            {goal.status === "active" && !isExpired && (
              <div className="col-span-2">
                <span className="text-gray-500">Time Remaining</span>
                <div className="font-medium">{days}d {hours}h</div>
              </div>
            )}
            {goal.contract_id != null && (
              <div className="col-span-2">
                <span className="text-gray-500">On-Chain ID</span>
                <div className="font-mono text-xs">{goal.contract_id}</div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {goal.status === "active" && !isExpired && (
            <button
              onClick={() => apiFetch<ProgressData>(`/api/goals/${id}/progress`).then(setProgress)}
              className="btn-secondary w-full"
            >
              Refresh Progress
            </button>
          )}

          {goal.status === "active" && isExpired && goal.contract_id != null && !goal.settled && (
            <button onClick={handleSettle} className="btn-primary w-full">
              {settleHash && !settleConfirmed ? "Settling..." : "Settle Goal"}
            </button>
          )}

          {goal.settled && goal.status !== "active" && goal.contract_id != null && (
            <button onClick={handleClaim} className="btn-primary w-full">
              {claimHash && !claimConfirmed ? "Claiming..." : `Claim Back (${goal.status === "achieved" ? "Full" : "Partial"})`}
            </button>
          )}

          {claimConfirmed && (
            <div className="text-center text-green-400 text-sm">Claimed successfully!</div>
          )}
          {settleConfirmed && !goal.settled && (
            <div className="text-center text-green-400 text-sm">Settled on-chain! Now claim your funds.</div>
          )}
        </div>
      </main>
    </div>
  )
}
