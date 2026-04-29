/**
 * DashboardPage — manager view.
 *
 * Sections:
 *   1. KPI strip (avg, reporting rate, count) — glanceable
 *   2. Open alerts list with multi-step ack flow
 *   3. Per-role breakdown — respects the aggregation threshold
 *   4. Daily trend (lightweight; full chart in Sprint 5)
 *
 * Spec v2 §11 directive: "the manager dashboard must answer 'is anyone
 * in trouble right now' within 5 seconds of opening it." → the alerts
 * section is *above* the analytics. KPI strip is small and quiet.
 */

import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import type {
  Alert,
  DashboardSummary,
} from '../types'


export default function DashboardPage() {
  const { user, logout } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [openAlerts, setOpenAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const [s, a] = await Promise.all([
        api.dashboardSummary(7),
        api.listAlerts('open'),
      ])
      setSummary(s)
      setOpenAlerts(a.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-500">
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-2xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 pt-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Ward Dashboard</h1>
          <p className="text-sm text-ink-500">Last 7 days</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs text-ink-500">
          {user && <span>{user.display_name}</span>}
          <button
            type="button"
            onClick={logout}
            className="text-ink-700 underline"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Open alerts FIRST — operational priority */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Open alerts ({openAlerts.length})
        </h2>
        {openAlerts.length === 0 ? (
          <p className="rounded-2xl bg-brand-50 px-4 py-6 text-center text-sm text-brand-900">
            No open alerts. Nothing requires immediate attention.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {openAlerts.map((alert) => (
              <AlertCard key={alert.alert_id} alert={alert} onChange={refresh} />
            ))}
          </ul>
        )}
      </section>

      {/* KPI strip */}
      {summary && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
            This week
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Kpi
              label="Avg energy"
              value={summary.avg_energy != null ? `${summary.avg_energy}%` : '—'}
            />
            <Kpi
              label="Reporting rate"
              value={`${Math.round(summary.reporting_rate * 100)}%`}
              sub={`${summary.unique_reporters} of ${summary.active_users}`}
            />
            <Kpi label="Check-ins" value={summary.total_checkins.toString()} />
          </div>
        </section>
      )}

      {/* Per-role breakdown */}
      {summary && summary.role_breakdown.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
            By role
          </h2>
          <ul className="flex flex-col divide-y divide-ink-300/40 rounded-2xl bg-ink-300/10">
            {summary.role_breakdown.map((row) => (
              <li
                key={row.role}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm font-medium capitalize text-ink-900">
                  {row.role}
                </span>
                <span className="text-sm text-ink-700">
                  {row.below_threshold ? (
                    <span className="text-ink-500">
                      {row.count} reports · below threshold ({summary.aggregation_threshold})
                    </span>
                  ) : (
                    <>
                      {row.avg}% avg · {row.count} reports
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Roles with fewer than {summary.aggregation_threshold} reports show
            no average — protecting individual privacy.
          </p>
        </section>
      )}

      {/* Trend (simple list, full chart in Sprint 5) */}
      {summary && summary.trend.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-500">
            Daily trend
          </h2>
          <ul className="flex flex-col divide-y divide-ink-300/40 rounded-2xl bg-ink-300/10 text-sm">
            {summary.trend.map((p) => (
              <li
                key={p.date}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="font-mono text-ink-700">{p.date}</span>
                <span className="text-ink-700">
                  {p.avg != null ? `${p.avg}%` : '—'} ({p.count})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}


function Kpi({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-2xl bg-brand-50 px-3 py-3 text-center">
      <div className="text-xs uppercase tracking-wide text-brand-900">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-ink-900">{value}</div>
      {sub && <div className="text-xs text-ink-500">{sub}</div>}
    </div>
  )
}


function AlertCard({
  alert,
  onChange,
}: {
  alert: Alert
  onChange: () => void | Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [showCloseForm, setShowCloseForm] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const ack = useCallback(
    async (step: 1 | 2 | 3, noteText?: string) => {
      setSubmitting(true)
      setError(null)
      try {
        await api.ackAlert(alert.alert_id, step, noteText)
        await onChange()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      } finally {
        setSubmitting(false)
      }
    },
    [alert.alert_id, onChange],
  )

  const isLow = alert.type === 'low'
  const created = new Date(alert.created_at)

  return (
    <li
      className={`rounded-2xl border p-4 ${
        isLow
          ? 'border-red-300 bg-red-50/50'
          : 'border-emerald-300 bg-emerald-50/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-500">
            {isLow ? 'Low energy' : 'High energy'} · {created.toLocaleString()}
          </div>
          <div className="mt-1 text-sm font-medium text-ink-900">
            Status: {alert.status}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {alert.status === 'open' && (
            <button
              type="button"
              onClick={() => ack(1)}
              disabled={submitting}
              className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Mark seen
            </button>
          )}
          {alert.status === 'ack1' && (
            <button
              type="button"
              onClick={() => ack(2)}
              disabled={submitting}
              className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Mark contacted
            </button>
          )}
          {alert.status === 'ack2' && !showCloseForm && (
            <button
              type="button"
              onClick={() => setShowCloseForm(true)}
              className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Close…
            </button>
          )}
        </div>
      </div>

      {showCloseForm && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`note-${alert.alert_id}`} className="text-xs text-ink-700">
            Closure note (required)
          </label>
          <textarea
            id={`note-${alert.alert_id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-ink-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!note.trim() || submitting}
              onClick={() => ack(3, note.trim())}
              className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Close alert
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCloseForm(false)
                setNote('')
              }}
              className="text-xs text-ink-500 underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
