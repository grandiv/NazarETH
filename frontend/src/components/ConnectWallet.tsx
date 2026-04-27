import { useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export default function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [showPicker, setShowPicker] = useState(false)

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

  const getLabel = (name: string) => {
    if (name === 'WalletConnect') return 'MetaMask / WalletConnect'
    if (name === 'Base Account') return 'Base Account'
    if (name === 'Injected') return 'Browser Wallet'
    return name
  }

  const connectorOrder = ['injected', 'walletConnect', 'baseAccount']

  const sorted = [...connectors].sort((a, b) => {
    const ai = connectorOrder.indexOf(a.id) ?? 99
    const bi = connectorOrder.indexOf(b.id) ?? 99
    return ai - bi
  })

  return (
    <div style={{ position: 'relative' }}>
      <button
        disabled={isPending}
        onClick={() => setShowPicker(!showPicker)}
        style={{
          background: 'linear-gradient(135deg, #054BFF, #3d7aff)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 700,
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          transition: 'all .15s ease',
          boxShadow: '0 2px 8px rgba(5,75,255,0.3)',
        }}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showPicker && (
        <>
          <div
            onClick={() => setShowPicker(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 998,
            }}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '6px 0',
            minWidth: 200,
            zIndex: 999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            {sorted.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  connect({ connector })
                  setShowPicker(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background .15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                {getLabel(connector.name)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
