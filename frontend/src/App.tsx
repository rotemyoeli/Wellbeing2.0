import { useEffect, useState } from 'react'
import { OfflineBanner } from './components/ErrorStates'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { api } from './lib/api'
import { t } from './lib/i18n'
import AlertDetailPage from './pages/AlertDetailPage'
import ClosuresPage from './pages/ClosuresPage'
import ComposerPage from './pages/ComposerPage'
import ConsentPage from './pages/ConsentPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import type { Alert } from './types'

type View =
  | { screen: 'home' }
  | { screen: 'dashboard' }
  | { screen: 'alert-detail'; alert: Alert }
  | { screen: 'composer' }
  | { screen: 'closures' }

function Router() {
  const { user, accessToken, loading } = useAuth()
  const [view, setView] = useState<View>({ screen: 'home' })
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null)
  const [online, setOnline] = useState(navigator.onLine)

  // Online/offline listener
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // Check consent status after login
  useEffect(() => {
    if (user && accessToken) {
      api.consentStatus()
        .then(s => setNeedsConsent(!s.hasConsent))
        .catch(() => setNeedsConsent(false))
    }
  }, [user, accessToken])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="text-ink-500">Loading…</div>
      </div>
    )
  }

  // Not authenticated
  if (!user && !accessToken) {
    return <LoginPage />
  }

  // Needs consent (A3) — skip in dev preview mode
  if (needsConsent === true && !user?.is_dev_mode) {
    return <ConsentPage onAccept={() => setNeedsConsent(false)} />
  }
  if (needsConsent === null && !user?.is_dev_mode) {
    return <div className="flex min-h-screen items-center justify-center bg-paper"><div className="text-ink-500">Loading…</div></div>
  }

  const canSeeDashboard = user?.role === 'manager' || user?.role === 'admin'

  return (
    <>
      {/* View switcher for managers */}
      {canSeeDashboard && view.screen !== 'alert-detail' && view.screen !== 'composer' && view.screen !== 'closures' && (
        <ViewSwitcher
          current={view.screen === 'dashboard' ? 'dashboard' : 'home'}
          onChange={(v) => setView({ screen: v })}
        />
      )}

      {view.screen === 'home' && <HomePage />}
      {view.screen === 'dashboard' && canSeeDashboard && (
        <DashboardPage
          onOpenAlert={(alert) => setView({ screen: 'alert-detail', alert })}
          onOpenComposer={() => setView({ screen: 'composer' })}
          onOpenClosures={() => setView({ screen: 'closures' })}
        />
      )}
      {view.screen === 'alert-detail' && (
        <AlertDetailPage
          alert={view.alert}
          onBack={() => setView({ screen: 'dashboard' })}
          onClosed={() => setView({ screen: 'dashboard' })}
        />
      )}
      {view.screen === 'composer' && (
        <ComposerPage
          onBack={() => setView({ screen: 'dashboard' })}
          onPublished={() => setView({ screen: 'dashboard' })}
        />
      )}
      {view.screen === 'closures' && (
        <ClosuresPage onBack={() => setView({ screen: 'dashboard' })} />
      )}

      {!online && <OfflineBanner />}
    </>
  )
}

function ViewSwitcher({ current, onChange }: { current: 'home' | 'dashboard'; onChange: (v: 'home' | 'dashboard') => void }) {
  return (
    <div className="fixed left-1/2 top-3 z-20 -translate-x-1/2 rounded-pill bg-sunken p-1 text-caption shadow-sm">
      <button
        type="button"
        onClick={() => onChange('home')}
        className={`rounded-pill px-3 py-1 transition ${
          current === 'home' ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500'
        }`}
      >
        {t('b5_checkInCta')}
      </button>
      <button
        type="button"
        onClick={() => onChange('dashboard')}
        className={`rounded-pill px-3 py-1 transition ${
          current === 'dashboard' ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500'
        }`}
      >
        {t('c1_title')}
      </button>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}
