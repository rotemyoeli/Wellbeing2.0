/**
 * C1 — Manager Dashboard.
 *
 * Phase 5D: Information architecture improvements.
 * Hierarchy: operational urgency (alerts) → KPIs → trend → analytics.
 * Spec v2 §11: "answer 'is anyone in trouble' within 5 seconds"
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
      const [s, a] = await Promise.all([
        api.dashboardSummary(period, user?.department_id || undefined),
        api.listAlerts('open'),
      ])
      setSummary(s)
      setOpenAlerts(a.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('a1_errNet'))
    } finally {
      setLoading(false)
    }
  }, [period, user?.department_id])

  useEffect(() => { refresh() }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-lg border border-line bg-surface flex items-center justify-center mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-500)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-body text-ink-700 text-center">{error}</p>
        <WBButton kind="primary" className="mt-4" onClick={refresh}>{t('f1_retry')}</WBButton>
      </div>
    )
  }

  const noData = !summary || summary.total_checkins === 0

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <WBBrand />
          <div className="flex items-center gap-3">
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-caption text-ink-500 underline">{t('signOut')}</button>
          </div>
        </div>

        <h1 className="text-h1 font-bold text-ink-900">{t('c1_title')}</h1>
        {user?.department_id && (
          <p className="text-caption text-ink-400 mt-0.5">{user.department_id}</p>
        )}

        {/* Period picker */}
        <div className="flex gap-1 mt-3 mb-6">
          {[7, 30, 90].map(p => (
            <button
              key={p}
              type="button"
              onClick={() => { setPeriod(p); setLoading(true) }}
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

        {noData ? (
          <WBCard sunken padding={32}>
            <p className="text-body text-ink-400 text-center">{t('c1_emptyDashboard')}</p>
          </WBCard>
        ) : (
          <>
            {/* === SECTION 1: Operational urgency (alerts) === */}
            <div className="mb-8">
              <WBSectionLabel count={openAlerts.length}>{t('c1_openAlerts')}</WBSectionLabel>
              {openAlerts.length === 0 ? (
                <WBCard sunken padding={16}>
                  <p className="text-caption text-teal-500 text-center">{t('c1_emptyAlerts')}</p>
                </WBCard>
              ) : (
                <div className="flex flex-col gap-3">
                  {openAlerts.map(a => (
                    <AlertRow key={a.alert_id} alert={a} onClick={() => onOpenAlert(a)} onRefresh={refresh} />
                  ))}
                </div>
              )}
            </div>

            {/* === SECTION 2: KPIs === */}
            {summary && (
              <div className="mb-8">
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
              </div>
            )}

            {/* === SECTION 3: Trend === */}
            {summary && summary.trend.length > 0 && (
              <div className="mb-8">
                <WBSectionLabel>{t('c1_dailyTrend')}</WBSectionLabel>
                <WBCard padding={0}>
                  <TrendChart trend={summary.trend} />
                </WBCard>
              </div>
            )}

            {/* === SECTION 4: Role breakdown (analytics) === */}
            {summary && summary.role_breakdown.length > 0 && (
              <div className="mb-8">
                <WBSectionLabel>{t('c1_byRole')}</WBSectionLabel>
                <WBCard padding={0}>
                  <table className="w-full text-caption">
                    <tbody>
                      {summary.role_breakdown.map(row => (
                        <tr key={row.role} className="border-b border-line last:border-b-0">
                          <td className="px-4 py-2.5 font-medium text-ink-900 capitalize">{row.role}</td>
                          <td className="px-4 py-2.5 text-ink-500">{row.count}</td>
                          <td className="px-4 py-2.5 w-32">
                            <div className="h-1.5 bg-line rounded-full overflow-hidden">
                              <div className="h-1.5 bg-accent-500 rounded-full transition-all" style={{ width: `${row.avg ?? 0}%` }} />
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-end text-ink-700">
                            {row.below_threshold ? <span className="text-ink-400 italic">{t('c1_belowThreshold')}</span> : `${row.avg}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-4 py-2.5 text-micro text-ink-400 border-t border-line">
                    {t('c1_thresholdFootnote', { n: `${summary.aggregation_threshold}` })}
                  </p>
                </WBCard>
              </div>
            )}
          </>
        )}

        {/* Manager actions */}
        <div className="flex gap-3 mt-2 mb-8">
          <WBButton kind="primary" onClick={onOpenComposer}>{t('c7_title')}</WBButton>
          <WBButton kind="secondary" onClick={onOpenClosures}>{t('c8_title')}</WBButton>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, unit, sub, warn }: { label: string; value: string; unit?: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${warn ? 'bg-alert-low-bg border-alert-low-border' : 'bg-surface border-line'}`}>
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
  const timeLabel = mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`

  const ack = async (step: 1 | 2) => {
    setSubmitting(true)
    try { await api.ackAlert(alert.alert_id, step); await onRefresh() } catch {} finally { setSubmitting(false) }
  }

  return (
    <WBCard padding={12}>
      <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={onClick}>
        <WBAlertType type={alert.type} label={alert.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh')} />
        <WBStatusPill
          status={alert.status}
          label={t(alert.status === 'open' ? 'c2_statusOpen' : alert.status === 'ack1' ? 'c2_statusSeen' : 'c2_statusContacted')}
        />
        <span className="text-micro text-ink-400 ms-auto font-mono">{timeLabel}</span>
      </div>
      <div className="flex gap-2">
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
      <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 text-caption font-bold shrink-0">!</div>
      <p className="flex-1 text-caption text-ink-700">{nudge.message}</p>
      <button type="button" onClick={onDismiss} className="text-ink-400 text-caption shrink-0 px-1">x</button>
    </div>
  )
}

function TrendChart({ trend }: { trend: { date: string; count: number; avg: number | null }[] }) {
  if (trend.length === 0) return null
  const maxCount = Math.max(...trend.map(d => d.count), 1)
  const h = 140

  return (
    <div className="px-4 py-4">
      <div className="flex items-end gap-[3px]" style={{ height: h }}>
        {trend.map(p => {
          const barH = Math.max(4, (p.count / maxCount) * h * 0.85)
          return (
            <div key={p.date} className="flex flex-col items-center flex-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition text-micro text-ink-500 bg-surface rounded px-1 shadow-sm whitespace-nowrap">
                {p.avg != null ? `${p.avg}%` : '—'} ({p.count})
              </div>
              <div className="w-full rounded-t-sm bg-accent-500 transition-all" style={{ height: barH }} />
            </div>
          )
        })}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {trend.map(p => (
          <div key={p.date} className="flex-1 text-center text-micro text-ink-400 truncate">
            {p.date.slice(5)}
          </div>
        ))}
      </div>
    </div>
  )
}
