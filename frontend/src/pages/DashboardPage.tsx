/**
 * C1 — Manager Dashboard.
 * Alerts-first design (Spec v2 §11: answer "is anyone in trouble" in 5 seconds).
 */
import { useCallback, useEffect, useState } from 'react'
import WBAlertType from '../components/ui/WBAlertType'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import WBStatusPill from '../components/ui/WBStatusPill'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { Alert, DashboardNudge, DashboardSummary } from '../types'

interface Props {
  onOpenAlert: (alert: Alert) => void
  onOpenComposer: () => void
  onOpenClosures: () => void
}

export default function DashboardPage({ onOpenAlert, onOpenComposer, onOpenClosures }: Props) {
  const { user, logout } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [openAlerts, setOpenAlerts] = useState<Alert[]>([])
  const [period, setPeriod] = useState(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dismissedNudges, setDismissedNudges] = useState<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    setError(null)
    try {
      // Fix #7: pass department scope when available
      const [s, a] = await Promise.all([
        api.dashboardSummary(period, user?.department_id || undefined),
        api.listAlerts('open'),
      ])
      setSummary(s)
      setOpenAlerts(a.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { refresh() }, [refresh])

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-500">Loading...</div>
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <p className="text-body text-alert-low-fg">{error}</p>
        <WBButton kind="primary" className="mt-4" onClick={refresh}>{t('f1_retry')}</WBButton>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <WBBrand />
            <div className="text-caption text-ink-500">{user?.display_name} · {t('role_manager')}</div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={logout} className="text-caption text-ink-500 underline">{t('signOut')}</button>
          </div>
        </div>

        <h1 className="text-h1 font-bold text-ink-900">{t('c1_title')}</h1>

        {/* Period picker */}
        <div className="flex gap-1 mt-3 mb-6">
          {[7, 30, 90].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-pill text-caption font-medium transition ${
                period === p ? 'bg-accent-700 text-white' : 'bg-sunken text-ink-500'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>

        {/* Nudges */}
        {summary?.nudges.filter(n => !dismissedNudges.has(n.type)).map(nudge => (
          <NudgeCard key={nudge.type} nudge={nudge} onDismiss={() => setDismissedNudges(s => new Set([...s, nudge.type]))} />
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Open alerts — left column */}
          <div className="lg:col-span-1">
            <WBSectionLabel count={openAlerts.length}>{t('c1_openAlerts')}</WBSectionLabel>
            {openAlerts.length === 0 ? (
              <WBCard sunken><p className="text-caption text-ink-400 text-center py-4">{t('c1_emptyAlerts')}</p></WBCard>
            ) : (
              <div className="flex flex-col gap-3">
                {openAlerts.map(a => (
                  <AlertRow key={a.alert_id} alert={a} onClick={() => onOpenAlert(a)} onRefresh={refresh} />
                ))}
              </div>
            )}
          </div>

          {/* KPIs + Trend — right columns */}
          {summary && (
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* KPI grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label={t('c1_kpiAvgEnergy')} value={summary.avg_energy != null ? `${summary.avg_energy}` : '—'} unit="%" />
                <KpiCard label={t('c1_kpiReportingRate')} value={`${Math.round(summary.reporting_rate * 100)}`} unit="%" sub={`${summary.unique_reporters} / ${summary.active_users}`} />
                <KpiCard label={t('c1_kpiCheckIns')} value={`${summary.total_checkins}`} />
                <KpiCard
                  label={t('c1_kpiPublishRate')}
                  value={summary.closure_publish_rate != null ? `${Math.round(summary.closure_publish_rate * 100)}` : '—'}
                  unit="%"
                  warn={summary.closure_publish_rate !== null && summary.closure_publish_rate < 0.5}
                />
              </div>

              {/* Daily trend */}
              {summary.trend.length > 0 && (
                <div>
                  <WBSectionLabel>{t('c1_dailyTrend')}</WBSectionLabel>
                  <WBCard padding={0}>
                    <TrendChart trend={summary.trend} />
                  </WBCard>
                </div>
              )}

              {/* Role breakdown */}
              {summary.role_breakdown.length > 0 && (
                <div>
                  <WBSectionLabel>{t('c1_byRole')}</WBSectionLabel>
                  <WBCard padding={0}>
                    <table className="w-full text-caption">
                      <tbody>
                        {summary.role_breakdown.map(row => (
                          <tr key={row.role} className="border-b border-line last:border-b-0">
                            <td className="px-4 py-2.5 font-medium text-ink-900 capitalize">{row.role}</td>
                            <td className="px-4 py-2.5 text-ink-500">{row.count}</td>
                            <td className="px-4 py-2.5 w-32">
                              <div className="h-1.5 bg-line rounded-full">
                                <div className="h-1.5 bg-accent-500 rounded-full" style={{ width: `${row.avg ?? 0}%` }} />
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-end text-ink-700">
                              {row.below_threshold ? <span className="text-ink-400">{t('c1_belowThreshold')}</span> : `${row.avg}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-4 py-2 text-micro text-ink-400">
                      {t('c1_thresholdFootnote', { n: `${summary.aggregation_threshold}` })}
                    </p>
                  </WBCard>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <WBButton kind="secondary" onClick={onOpenComposer}>{t('c7_title')}</WBButton>
                <WBButton kind="ghost" onClick={onOpenClosures}>{t('c8_title')}</WBButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, unit, sub, warn }: { label: string; value: string; unit?: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border border-line px-4 py-3 ${warn ? 'bg-alert-low-bg' : 'bg-surface'}`}>
      <div className="text-micro font-semibold uppercase tracking-widest text-ink-500">{label}</div>
      <div className="mt-1 text-[28px] font-bold text-ink-900 leading-tight">
        {value}{unit && <span className="text-body font-normal text-ink-400">{unit}</span>}
      </div>
      {sub && <div className="text-micro text-ink-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function AlertRow({ alert, onClick, onRefresh }: { alert: Alert; onClick: () => void; onRefresh: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const created = new Date(alert.created_at)
  const mins = Math.round((Date.now() - created.getTime()) / 60000)

  const ack = async (step: 1 | 2) => {
    setSubmitting(true)
    try { await api.ackAlert(alert.alert_id, step); await onRefresh() } catch {} finally { setSubmitting(false) }
  }

  return (
    <WBCard padding={12} className="cursor-pointer" >
      <div className="flex items-center gap-2 mb-2" onClick={onClick}>
        <WBAlertType type={alert.type} label={alert.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh')} />
        <WBStatusPill status={alert.status} label={t(`c2_status${alert.status === 'open' ? 'Open' : alert.status === 'ack1' ? 'Seen' : 'Contacted'}` as 'c2_statusOpen')} />
        <span className="text-micro text-ink-400 ms-auto">{mins}m</span>
      </div>
      <div className="flex gap-2 mt-2">
        {alert.status === 'open' && (
          <WBButton kind="secondary" size="sm" disabled={submitting} onClick={() => ack(1)}>{t('c2_actionMarkSeen')}</WBButton>
        )}
        {alert.status === 'ack1' && (
          <WBButton kind="secondary" size="sm" disabled={submitting} onClick={() => ack(2)}>{t('c2_actionMarkContacted')}</WBButton>
        )}
        {alert.status === 'ack2' && (
          <WBButton kind="primary" size="sm" onClick={onClick}>{t('c2_actionClose')}</WBButton>
        )}
      </div>
    </WBCard>
  )
}

function NudgeCard({ nudge, onDismiss }: { nudge: DashboardNudge; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border-s-[3px] border-accent-700 bg-accent-50 px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 shrink-0">!</div>
      <div className="flex-1">
        <p className="text-caption font-semibold text-ink-900">{nudge.message}</p>
      </div>
      <button type="button" onClick={onDismiss} className="text-micro text-ink-400 shrink-0">x</button>
    </div>
  )
}

function TrendChart({ trend }: { trend: { date: string; count: number; avg: number | null }[] }) {
  if (trend.length === 0) return null
  const maxCount = Math.max(...trend.map(t => t.count), 1)
  const h = 120

  return (
    <div className="px-4 py-3">
      <div className="flex items-end gap-1" style={{ height: h }}>
        {trend.map(p => (
          <div key={p.date} className="flex flex-col items-center flex-1">
            <div className="w-full bg-accent-100 rounded-t" style={{ height: `${(p.count / maxCount) * h * 0.8}px` }}>
              <div className="w-full bg-accent-500 rounded-t" style={{ height: `${((p.avg ?? 0) / 100) * (p.count / maxCount) * h * 0.8}px` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {trend.map(p => (
          <div key={p.date} className="flex-1 text-center text-micro text-ink-400 truncate">{p.date.slice(5)}</div>
        ))}
      </div>
    </div>
  )
}
