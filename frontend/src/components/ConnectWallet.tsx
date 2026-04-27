import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--success)',
          boxShadow: '0 0 6px rgba(0,212,170,0.5)',
        }} />
        <span style={{
          fontSize: 13, color: 'var(--text2)',
          fontFamily: 'monospace', letterSpacing: '0.02em',
        }}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--muted)',
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s ease',
          }}
        >
          Disconnect
        </button>
      </div>
    )
  }

  const activeConnectors = connectors.filter(c => c.ready || c.id === 'injected' || c.id === 'coinbaseWalletSDK')

  if (activeConnectors.length <= 1) {
    return (
      <button
        disabled={isPending}
        onClick={() => connect({ connector: activeConnectors[0] || connectors[0] })}
        style={{
          background: 'linear-gradient(135deg, #054BFF, #3d7aff)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all .15s ease',
          boxShadow: '0 2px 8px rgba(5,75,255,0.3)',
        }}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {activeConnectors.map(c => (
        <button
          key={c.uid}
          disabled={isPending}
          onClick={() => connect({ connector: c })}
          style={{
            background: 'linear-gradient(135deg, #054BFF, #3d7aff)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s ease',
            boxShadow: '0 2px 8px rgba(5,75,255,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {isPending ? '...' : (c.name === 'Coinbase Wallet' ? 'Coinbase' : c.name === 'Injected' ? 'MetaMask' : c.name)}
        </button>
      ))}
    </div>
  )
}
