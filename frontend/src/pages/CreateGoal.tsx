import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import { parseUnits } from "viem"
import { useAuth } from "../auth"
import { useApi } from "../api"
import { CONTRACT_ADDRESS, USDC_ADDRESS } from "../config"
import { GOAL_VAULT_ABI, ERC20_ABI } from "../abi"
import { ConnectButton } from "../components/ConnectButton"

type GoalType = "distance" | "count"
type Provider = "strava" | "hevy"

const GOAL_TYPE_MAP: Record<GoalType, number> = { distance: 0, count: 1 }

const GOAL_PRESETS = [
  { label: "Run 5 km", type: "distance" as GoalType, target: 5000, provider: "strava" as Provider },
  { label: "Run 10 km", type: "distance" as GoalType, target: 10000, provider: "strava" as Provider },
  { label: "Run 21 km (half marathon)", type: "distance" as GoalType, target: 21000, provider: "strava" as Provider },
  { label: "Run 3 times", type: "count" as GoalType, target: 3, provider: "strava" as Provider },
]

const STAKE_OPTIONS = ["10", "25", "50", "100"]

const DEADLINE_OPTIONS = [
  { label: "3 days", seconds: 3 * 86400 },
  { label: "1 week", seconds: 7 * 86400 },
  { label: "2 weeks", seconds: 14 * 86400 },
  { label: "1 month", seconds: 30 * 86400 },
]

export function CreateGoalPage() {
  const { isConnected } = useAccount()
  const { isAuthenticated } = useAuth()
  const { apiFetch } = useApi()
  const navigate = useNavigate()

  const [preset, setPreset] = useState(0)
  const [stake, setStake] = useState("25")
  const [deadlineIdx, setDeadlineIdx] = useState(1)
  const [step, setStep] = useState<"form" | "approve" | "done">("form")

  const goal = GOAL_PRESETS[preset]
  const deadlineSeconds = DEADLINE_OPTIONS[deadlineIdx].seconds
  const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds
  const stakeAmount = parseUnits(stake, 6)

  const { writeContract: approve, data: approveHash } = useWriteContract()
  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash })
  const { writeContract: createGoal, data: createHash } = useWriteContract()
  const { isSuccess: createConfirmed } = useWaitForTransactionReceipt({ hash: createHash })

  const handleCreate = async () => {
    if (!isAuthenticated) return

    await apiFetch<{ id: number }>("/api/goals", {
      method: "POST",
      body: JSON.stringify({
        provider: goal.provider,
        goal_type: goal.type,
        target_value: goal.target,
        deadline,
        stake_amount: stake,
      }),
    })
    setStep("approve")

    approve({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACT_ADDRESS, stakeAmount],
    })
  }

  const handleCreateOnChain = () => {
    createGoal({
      address: CONTRACT_ADDRESS,
      abi: GOAL_VAULT_ABI,
      functionName: "createGoal",
      args: [GOAL_TYPE_MAP[goal.type], BigInt(goal.target), BigInt(deadline)],
    })
  }


  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Connect wallet and sign in first</p>
          <ConnectButton />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white">&larr; Back</button>
        <ConnectButton />
      </nav>

      <main className="max-w-lg mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold mb-6">Create Goal</h2>

        {step === "form" && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Goal</label>
              <div className="grid grid-cols-2 gap-2">
                {GOAL_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPreset(i)}
                    className={`p-3 rounded-lg border text-sm transition-colors ${
                      preset === i ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Stake (USDC)</label>
              <div className="grid grid-cols-4 gap-2">
                {STAKE_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setStake(s)}
                    className={`p-3 rounded-lg border text-sm transition-colors ${
                      stake === s ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    ${s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Deadline</label>
              <div className="grid grid-cols-4 gap-2">
                {DEADLINE_OPTIONS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDeadlineIdx(i)}
                    className={`p-3 rounded-lg border text-sm transition-colors ${
                      deadlineIdx === i ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-600"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleCreate} className="btn-primary w-full py-3 text-lg">
              Create & Stake ${stake} USDC
            </button>
          </div>
        )}

        {step === "approve" && (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Step 1: Approve USDC</h3>
            <p className="text-gray-400">Allow GoalVault to transfer ${stake} USDC</p>
            {!approveHash && (
              <p className="text-yellow-400">Check your wallet...</p>
            )}
            {approveHash && !approveConfirmed && (
              <p className="text-blue-400">Waiting for confirmation...</p>
            )}
            {approveConfirmed && (
              <button onClick={handleCreateOnChain} className="btn-primary">
                Step 2: Create Goal On-Chain &rarr;
              </button>
            )}
          </div>
        )}

        {createHash && (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold">Goal Created!</h3>
            {createConfirmed ? (
              <>
                <p className="text-green-400">Transaction confirmed</p>
                <button onClick={() => navigate("/dashboard")} className="btn-primary">
                  Go to Dashboard &rarr;
                </button>
              </>
            ) : (
              <p className="text-blue-400">Waiting for confirmation...</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
