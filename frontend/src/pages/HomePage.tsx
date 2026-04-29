/**
 * HomePage — the post-login landing page.
 *
 * Shows the BatteryCheckIn front-and-centre (the whole product is one
 * screen by design), with a discrete sign-out link at top.
 */

import { useEffect, useState } from 'react'
import BatteryCheckIn from '../components/BatteryCheckIn'
import { useAuth } from '../contexts/AuthContext'
import { api, type HealthResponse } from '../lib/api'
import type { CheckInPayload } from '../types'

export default function HomePage() {
  const { user, logout } = useAuth()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((err) => {
        setHealthError(
          err instanceof Error
            ? err.message
            : 'Cannot reach backend on /api/v1/health',
        )
      })
  }, [])

  const handleSubmit = async (payload: CheckInPayload) => {
    await api.submitCheckIn(payload)
  }

  return (
    <>
      {/* Top bar with sign-out — discrete; no logo or brand crowding */}
      <div className="absolute right-3 top-3 flex items-center gap-3 text-xs text-ink-500">
        {user && <span>{user.display_name || user.user_id}</span>}
        <button
          type="button"
          onClick={logout}
          className="rounded-full px-2.5 py-1 text-xs text-ink-700 underline"
        >
          Sign out
        </button>
      </div>

      <BatteryCheckIn onSubmit={handleSubmit} />

      {/* Tiny dev-mode footer */}
      {health?.dev_mode && (
        <div
          className="fixed bottom-2 right-2 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900 shadow-sm"
          role="note"
        >
          DEV MODE · v{health.version}
        </div>
      )}
      {healthError && (
        <div
          className="fixed bottom-2 left-2 right-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800"
          role="alert"
        >
          Backend unreachable: {healthError}.
        </div>
      )}
    </>
  )
}
