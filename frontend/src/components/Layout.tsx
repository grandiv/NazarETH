import { useState } from 'react'
import type { Page } from '../App'
import ConnectWallet from './ConnectWallet'
import GuideModal from './GuideModal'

async function addBaseSepoliaToMetaMask() {
  await (window as any).ethereum?.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: '0x14a34',
      chainName: 'Base Sepolia',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://sepolia.base.org'],
      blockExplorerUrls: ['https://sepolia.basescan.org'],
    }],
  })
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'register', label: 'Register', icon: '👤' },
  { id: 'new-challenge', label: 'New Challenge', icon: '🎯' },
  { id: 'active', label: 'My Challenge', icon: '⚡' },
  { id: 'simulate', label: 'Simulate Run', icon: '🏃' },
  { id: 'territory', label: 'Territory', icon: '🗺️' },
  { id: 'history', label: 'History', icon: '📜' },
]

interface Props {
  currentPage: Page
  onNavigate: (p: Page) => void
  children: React.ReactNode
  banner?: React.ReactNode
}

export default function Layout({ currentPage, onNavigate, children, banner }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  const showGuide = !localStorage.getItem('nazareth_guide_seen')
  useState(() => {
    if (showGuide) setGuideOpen(true)
  })

  function handleClose() {
    setGuideOpen(false)
    localStorage.setItem('nazareth_guide_seen', '1')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <GuideModal open={guideOpen} onClose={handleClose} />

      <header style={{
        background: 'linear-gradient(180deg, #0a1535 0%, var(--surface) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16, flexShrink: 0 }}>
          <img src="/logo_nazareth.png" alt="N" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: '#fff' }}>
            Nazar<span style={{ color: 'var(--accent2)' }}>ETH</span>
          </span>
        </div>

        <nav className="desktop-nav">
          {NAV_ITEMS.map(item => {
            const active = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="nav-btn"
                style={{
                  background: active ? 'rgba(5,75,255,0.12)' : 'transparent',
                  color: active ? 'var(--accent2)' : 'var(--muted)',
                  borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                <span style={{ marginRight: 4 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="header-actions">
          <button
            onClick={() => setGuideOpen(true)}
            className="btn-chain"
            title="How to use"
          >
            ?
          </button>
          <button
            onClick={addBaseSepoliaToMetaMask}
            className="btn-chain desktop-only"
            title="Add Base Sepolia to MetaMask"
          >
            + Base
          </button>
          <ConnectWallet />
        </div>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span style={{
            display: 'block', width: 20, height: 2, background: 'var(--text)',
            borderRadius: 1, transition: 'all .2s',
            transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none',
          }} />
          <span style={{
            display: 'block', width: 20, height: 2, background: 'var(--text)',
            borderRadius: 1, marginTop: 5, transition: 'all .2s',
            opacity: menuOpen ? 0 : 1,
          }} />
          <span style={{
            display: 'block', width: 20, height: 2, background: 'var(--text)',
            borderRadius: 1, marginTop: menuOpen ? -7 : 5, transition: 'all .2s',
            transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none',
          }} />
        </button>
      </header>

      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          <nav className="mobile-nav">
            {NAV_ITEMS.map(item => {
              const active = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMenuOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '14px 20px',
                    background: active ? 'rgba(5,75,255,0.1)' : 'transparent',
                    color: active ? 'var(--accent2)' : 'var(--text2)',
                    border: 'none', borderBottom: '1px solid var(--border)',
                    fontSize: 15, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
              <div style={{ marginBottom: 12 }}>
                <ConnectWallet />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setGuideOpen(true); setMenuOpen(false) }} className="btn-chain" style={{ flex: 1, padding: '10px 14px' }}>
                  ? Guide
                </button>
                {typeof (window as any).ethereum !== 'undefined' && (
                  <button onClick={addBaseSepoliaToMetaMask} className="btn-chain" style={{ flex: 1, padding: '10px 14px' }}>
                    + Base Sepolia
                  </button>
                )}
              </div>
            </div>
          </nav>
        </div>
      )}

      {banner}

      <main style={{
        flex: 1,
        padding: '20px 16px',
        maxWidth: 960,
        width: '100%',
        margin: '0 auto',
        animation: 'fadeIn .25s ease',
      }}>
        {children}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '14px',
        color: 'var(--muted)',
        fontSize: 11,
        borderTop: '1px solid var(--border)',
      }}>
        NazarETH · Built on Base · Stake. Train. Compete. Earn.
      </footer>
    </div>
  )
}
