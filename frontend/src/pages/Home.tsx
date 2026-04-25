import { Link } from "react-router-dom"
import { useAccount } from "wagmi"
import { useAuth } from "../auth"
import { ConnectButton } from "../components/ConnectButton"

export function HomePage() {
  const { isConnected } = useAccount()
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">NazarETH</h1>
        <ConnectButton />
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <h2 className="text-5xl font-bold mb-4">
          Stake on <span className="text-blue-400">Yourself</span>
        </h2>
        <p className="text-xl text-gray-400 mb-8 max-w-lg">
          Set a fitness goal. Stake USDC. Earn it back by achieving it — or lose a portion if you don't.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn-primary text-lg px-8 py-3">
              Go to Dashboard
            </Link>
          ) : isConnected ? (
            <ConnectButton />
          ) : (
            <ConnectButton />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="card text-center">
            <div className="text-3xl mb-2">&#127939;</div>
            <h3 className="font-semibold mb-1">Connect Strava</h3>
            <p className="text-sm text-gray-500">Link your running data for distance goals</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">&#128176;</div>
            <h3 className="font-semibold mb-1">Stake USDC</h3>
            <p className="text-sm text-gray-500">Lock funds on Base as commitment collateral</p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-2">&#127942;</div>
            <h3 className="font-semibold mb-1">Earn or Learn</h3>
            <p className="text-sm text-gray-500">Get 100% back if achieved, graduated slash if not</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-4 text-center text-sm text-gray-600">
        Built on Base | Open Source | Base Batches 003
      </footer>
    </div>
  )
}
