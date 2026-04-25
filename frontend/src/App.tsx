import { useState, useEffect } from 'react'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import RegisterPage from './pages/RegisterPage'
import NewChallengePage from './pages/NewChallengePage'
import ActiveChallengePage from './pages/ActiveChallengePage'
import OraclePage from './pages/OraclePage'
import HistoryPage from './pages/HistoryPage'
import SimulateRunPage from './pages/SimulateRunPage'

export type Page = 'dashboard' | 'register' | 'new-challenge' | 'active' | 'oracle' | 'history' | 'simulate'

function getPageFromURL(): Page | null {
  const path = window.location.pathname.replace(/^\//, '').replace(/\/$/, '')
  if (path === 'register') return 'register'
  if (path === 'new-challenge') return 'new-challenge'
  if (path === 'active') return 'active'
  if (path === 'oracle') return 'oracle'
  if (path === 'history') return 'history'
  if (path === 'simulate') return 'simulate'
  const params = new URLSearchParams(window.location.search)
  if (params.get('strava_athlete_id')) return 'register'
  return null
}

function WrongChainBanner() {
  const { switchChain, isPending } = useSwitchChain()
  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(252,76,2,0.08), rgba(252,76,2,0.15))',
      borderBottom: '1px solid rgba(252,76,2,0.25)',
      padding: '10px 28px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(252,76,2,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14,
      }}>
        ⚠️
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>Wrong Network</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          This app runs on Base Sepolia. Switch your network to continue.
        </div>
      </div>
      <button
        disabled={isPending}
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        style={{
          background: 'linear-gradient(135deg, #FC4C02, #ff7e3a)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          padding: '6px 16px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {isPending ? 'Switching...' : 'Switch to Base Sepolia'}
      </button>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(() => getPageFromURL() ?? 'dashboard')
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isWrongChain = isConnected && chainId !== baseSepolia.id

  useEffect(() => {
    const onPopState = () => {
      const p = getPageFromURL()
      if (p) setPage(p)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (p: Page) => {
    setPage(p)
    window.history.pushState({}, '', '/' + (p === 'dashboard' ? '' : p))
  }

  return (
    <Layout currentPage={page} onNavigate={navigate} banner={isWrongChain ? <WrongChainBanner /> : undefined}>
      {page === 'dashboard' && <DashboardPage onNavigate={navigate} />}
      {page === 'register' && <RegisterPage onNavigate={navigate} />}
      {page === 'new-challenge' && <NewChallengePage onNavigate={navigate} />}
      {page === 'active' && <ActiveChallengePage />}
      {page === 'oracle' && <OraclePage />}
      {page === 'history' && <HistoryPage />}
      {page === 'simulate' && <SimulateRunPage onNavigate={navigate} />}
    </Layout>
  )
}
