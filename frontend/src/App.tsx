/**
 * App router — Phase 6B: Mobile app shell with bottom navigation.
 *
 * Routes:
 *   #/           → home (employee greeting + hero CTA + updates preview)
 *   #/checkin    → check-in flow (battery/orb/faces → followup → comment → thanks)
 *   #/updates    → team updates feed
 *   #/dashboard  → manager dashboard
 *   #/alert/:id  → alert detail (fetches from API by ID)
 *   #/composer   → team update composer
 *   #/closures   → review unpublished closures
 */
import React, { Suspense, useEffect, useState } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import { OfflineBanner } from './components/ErrorStates'
import WBBottomNav, { type TabId } from './components/ui/WBBottomNav'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { api } from './lib/api'

// Lazy-loaded pages (#18) — reduces initial bundle size
const AlertDetailPage = React.lazy(() => import('./pages/AlertDetailPage'))
const CheckInPage = React.lazy(() => import('./pages/CheckInPage'))
const ClosuresPage = React.lazy(() => import('./pages/ClosuresPage'))
const ComposerPage = React.lazy(() => import('./pages/ComposerPage'))
const ConsentPage = React.lazy(() => import('./pages/ConsentPage'))
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
const HomePage = React.lazy(() => import('./pages/HomePage'))
const LoginPage = React.lazy(() => import('./pages/LoginPage'))
import WBOnboarding from './components/ui/WBOnboarding'
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'))
import WBToastContainer from './components/ui/WBToast'
const UpdatesPage = React.lazy(() => import('./pages/UpdatesPage'))
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

/** Map route to active tab. Sub-routes inherit parent tab. */
function routeToTab(route: string): TabId {
  if (route === '/checkin') return 'checkin'
  if (route === '/updates') return 'updates'
  if (route === '/settings') return 'settings'
  if (route === '/dashboard' || route.startsWith('/alert/') || route === '/composer' || route === '/closures') return 'manage'
  return 'home'
}

function Router() {
  const { user, accessToken, loading } = useAuth()
  const hash = useHash()
  const [needsConsent, setNeedsConsent] = useState<boolean | null>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [needsOnboarding, setNeedsOnboarding] = useState(() =>
    localStorage.getItem('wellbeing.onboarded') !== 'true'
  )
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

  // Loading spinner (before auth resolved)
  if (loading) {
    return (
      <div className="flex min-h-app items-center justify-center bg-paper">
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  // Not authenticated → login
  if (!user && !accessToken) {
    return <Suspense fallback={null}><LoginPage /></Suspense>
  }

  // Consent gate
  if (needsConsent === true && !user?.is_dev_mode) {
    return <Suspense fallback={null}><ConsentPage onAccept={() => setNeedsConsent(false)} /></Suspense>
  }
  if (needsConsent === null && !user?.is_dev_mode) {
    return (
      <div className="flex min-h-app items-center justify-center bg-paper">
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  // Onboarding wizard for first-time users
  if (needsOnboarding && !user?.is_dev_mode) {
    return <WBOnboarding onComplete={() => setNeedsOnboarding(false)} />
  }

  const canSeeDashboard = user?.role === 'manager' || user?.role === 'admin'
  const route = hash.replace('#', '') || '/'

  const openAlert = (alert: Alert) => {
    setSelectedAlert(alert)
    navigate('#/alert/' + alert.alert_id)
  }

  const alertIdFromRoute = route.startsWith('/alert/') ? route.replace('/alert/', '') : null

  // Pages that have their own full-screen layout (no bottom nav)
  const isFullScreenRoute = route === '/checkin'

  // Determine which screen to render
  let screen: React.ReactNode = null

  if (route === '/' || route === '') {
    screen = <HomePage onStartCheckIn={() => navigate('#/checkin')} />
  } else if (route === '/checkin') {
    screen = <CheckInPage onDone={() => navigate('#/')} />
  } else if (route === '/updates') {
    screen = <UpdatesPage />
  } else if (route === '/dashboard' && canSeeDashboard) {
    screen = (
      <DashboardPage
        onOpenAlert={openAlert}
        onOpenComposer={() => navigate('#/composer')}
        onOpenClosures={() => navigate('#/closures')}
      />
    )
  } else if (alertIdFromRoute && canSeeDashboard) {
    screen = (
      <AlertDetailPage
        alert={selectedAlert}
        alertId={alertIdFromRoute}
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
  } else if (route === '/settings' && user?.role === 'admin') {
    screen = <SettingsPage />
  } else {
    screen = <HomePage onStartCheckIn={() => navigate('#/checkin')} />
  }

  const handleTabNavigate = (tab: TabId) => {
    switch (tab) {
      case 'home': navigate('#/'); break
      case 'checkin': navigate('#/checkin'); break
      case 'updates': navigate('#/updates'); break
      case 'manage': navigate('#/dashboard'); break
      case 'settings': navigate('#/settings'); break
    }
  }

  const activeTab = routeToTab(route)

  const suspenseFallback = (
    <div className="flex min-h-app items-center justify-center bg-paper">
      <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
    </div>
  )

  return (
    <>
      <Suspense fallback={suspenseFallback}>
        <div key={route} className="animate-fadeIn">
          {screen}
        </div>
      </Suspense>
      {!isFullScreenRoute && (
        <WBBottomNav
          current={activeTab}
          onNavigate={handleTabNavigate}
          userRole={user?.role}
        />
      )}
      {!online && <OfflineBanner />}
    </>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router />
        <WBToastContainer />
      </AuthProvider>
    </ErrorBoundary>
  )
}
