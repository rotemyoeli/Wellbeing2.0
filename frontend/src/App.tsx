/**
 * App router — Phase 5E: hash-based routing for deep links + back/refresh.
 *
 * Routes:
 *   #/           → home (employee check-in)
 *   #/dashboard  → manager dashboard
 *   #/alert/:id  → alert detail (needs alert data, falls back to dashboard)
 *   #/composer   → team update composer
 *   #/closures   → review unpublished closures
 */
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

function navigate(hash: string) {
  window.location.hash = hash
}

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash || '#/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

function Router() {
  const { user, accessToken, loading } = useAuth()
  const hash = useHash()
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

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
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  if (!user && !accessToken) {
    return <LoginPage />
  }

  if (needsConsent === true && !user?.is_dev_mode) {
    return <ConsentPage onAccept={() => setNeedsConsent(false)} />
  }
  if (needsConsent === null && !user?.is_dev_mode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  const canSeeDashboard = user?.role === 'manager' || user?.role === 'admin'
  const route = hash.replace('#', '') || '/'

  const openAlert = (alert: Alert) => {
    setSelectedAlert(alert)
    navigate('#/alert/' + alert.alert_id)
  }

  // Determine which screen to render
  let screen: React.ReactNode = null

  if (route === '/' || route === '') {
    screen = <HomePage />
  } else if (route === '/dashboard' && canSeeDashboard) {
    screen = (
      <DashboardPage
        onOpenAlert={openAlert}
        onOpenComposer={() => navigate('#/composer')}
        onOpenClosures={() => navigate('#/closures')}
      />
    )
  } else if (route.startsWith('/alert/') && selectedAlert) {
    screen = (
      <AlertDetailPage
        alert={selectedAlert}
        onBack={() => navigate('#/dashboard')}
        onClosed={() => { setSelectedAlert(null); navigate('#/dashboard') }}
      />
    )
  } else if (route === '/composer' && canSeeDashboard) {
    screen = (
      <ComposerPage
        onBack={() => navigate('#/dashboard')}
        onPublished={() => navigate('#/dashboard')}
      />
    )
  } else if (route === '/closures' && canSeeDashboard) {
    screen = <ClosuresPage onBack={() => navigate('#/dashboard')} />
  } else {
    // Fallback: go home
    screen = <HomePage />
  }

  return (
    <>
      {canSeeDashboard && (route === '/' || route === '/dashboard') && (
        <ViewSwitcher
          current={route === '/dashboard' ? 'dashboard' : 'home'}
          onChange={(v) => navigate(v === 'dashboard' ? '#/dashboard' : '#/')}
        />
      )}
      {screen}
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
        className={`rounded-pill px-3 py-1 transition focus-visible:shadow-focus outline-none ${
          current === 'home' ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500'
        }`}
      >
        {t('b5_checkInCta')}
      </button>
      <button
        type="button"
        onClick={() => onChange('dashboard')}
        className={`rounded-pill px-3 py-1 transition focus-visible:shadow-focus outline-none ${
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
