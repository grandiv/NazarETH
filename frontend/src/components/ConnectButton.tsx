import { useState } from "react"
import { useAccount, useConnect, useSignMessage } from "wagmi"
import { useAuth } from "../auth"

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { isAuthenticated, login, logout, wallet } = useAuth()
  const { signMessageAsync } = useSignMessage()
  const [showModal, setShowModal] = useState(false)

  if (isAuthenticated && wallet) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-300">{wallet.slice(0, 6)}...{wallet.slice(-4)}</span>
        <button onClick={logout} className="btn-secondary text-sm">Disconnect</button>
      </div>
    )
  }

  if (isConnected && address) {
    return (
      <button
        className="btn-primary text-sm"
        onClick={() => login(address, async (msg) => {
          const sig = await signMessageAsync({ message: msg })
          return sig
        })}
      >
        Sign In with Wallet
      </button>
    )
  }

  return (
    <>
      <button className="btn-primary text-sm" onClick={() => setShowModal(true)}>
        Connect Wallet
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Connect Wallet</h3>
            <div className="space-y-2">
              {connectors.map(c => (
                <button
                  key={c.uid}
                  onClick={() => { connect({ connector: c }); setShowModal(false) }}
                  disabled={isPending}
                  className="btn-secondary w-full text-left"
                >
                  {c.name}
                </button>
              ))}
            </div>
            {error && <p className="text-red-400 text-sm mt-3">{error.message}</p>}
            <button onClick={() => setShowModal(false)} className="mt-3 text-gray-500 text-sm w-full text-center">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
