import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'

type View = 'home' | 'dashboard'

function Router() {
  const { user, accessToken, loading } = useAuth()
  const [view, setView] = useState<View>('home')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-ink-500">Loading…</div>
      </div>
    )
  }

  if (!user && !accessToken) {
    return <LoginPage />
  }

  // Role-aware default landing:
  //   employee → BatteryCheckIn (HomePage)
  //   manager / admin → may toggle between check-in and dashboard
  const canSeeDashboard =
    user?.role === 'manager' || user?.role === 'admin'

  return (
    <>
      {canSeeDashboard && (
        <ViewSwitcher current={view} onChange={setView} />
      )}
      {view === 'dashboard' && canSeeDashboard ? (
        <DashboardPage />
      ) : (
        <HomePage />
      )}
    </>
  )
}


function ViewSwitcher({
  current,
  onChange,
}: {
  current: View
  onChange: (v: View) => void
}) {
  return (
    <div className="fixed left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-ink-900/5 p-1 text-xs">
      <button
        type="button"
        onClick={() => onChange('home')}
        className={`rounded-full px-3 py-1 transition ${
          current === 'home' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-700'
        }`}
      >
        Check-in
      </button>
      <button
        type="button"
        onClick={() => onChange('dashboard')}
        className={`rounded-full px-3 py-1 transition ${
          current === 'dashboard'
            ? 'bg-white text-ink-900 shadow-sm'
            : 'text-ink-700'
        }`}
      >
        Dashboard
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
