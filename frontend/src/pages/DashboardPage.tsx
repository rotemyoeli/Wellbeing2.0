/**
 * C1 — Manager Dashboard (Premium redesign).
 *
 * Layout: Visual hero → charts → KPI rings → alerts → role table → actions
 * Design: graphs and visual elements first, data and lists below.
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
    } catch {
      setError(t('f1_netErrBody'))
    } finally {
      setLoading(false)
    }
  }, [period, user?.department_id])

  useEffect(() => { refresh() }, [refresh])

  if (loading) {
    return (
      <div className="flex min-h-app items-center justify-center bg-paper pb-nav">
        <div className="w-10 h-10 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-app bg-paper flex flex-col items-center justify-center px-6 pb-nav pt-safe">
        <div className="w-16 h-16 rounded-xl border border-line bg-surface flex items-center justify-center mb-6 shadow-sm">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-h3 font-semibold text-ink-900 text-center">{t('f1_netErrTitle')}</h1>
        <p className="text-body text-ink-500 text-center mt-3 max-w-[320px] leading-relaxed">{error}</p>
        <WBButton kind="primary" className="mt-8" onClick={refresh}>{t('f1_retry')}</WBButton>
      </div>
    )
  }

  const noData = !summary || summary.total_checkins === 0

  return (
    <div className="min-h-app bg-paper pb-nav">
      <div className="max-w-5xl mx-auto px-5 pt-safe">
        {/* ── Header ── */}
        <div className="flex items-center justify-between py-3">
          <WBBrand size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-micro text-ink-400 underline no-tap-highlight">{t('signOut')}</button>
          </div>
        </div>

        <div className="flex items-end justify-between mt-1 mb-4">
          <div>
            <h1 className="text-h1 font-bold text-ink-900">{t('c1_title')}</h1>
            {user?.department_id && (
              <p className="text-caption text-ink-400 mt-0.5">{user.department_id}</p>
            )}
          </div>
          {/* Period picker */}
          <div className="flex gap-1">
            {[7, 30, 90].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setPeriod(p); setLoading(true) }}
                className={`px-3 py-1.5 rounded-pill text-caption font-medium transition ${
                  period === p ? 'bg-accent-700 text-white' : 'bg-sunken text-ink-500'
                }`}
              >
                {p === 7 ? t('c1_periodPicker_7') : p === 30 ? t('c1_periodPicker_30') : t('c1_periodPicker_90')}
              </button>
            ))}
          </div>
        </div>

        {/* Nudges */}
        {summary?.nudges.filter(n => !dismissedNudges.has(n.type)).map(nudge => (
          <NudgeCard key={nudge.type} nudge={nudge} onDismiss={() => setDismissedNudges(s => new Set([...s, nudge.type]))} />
        ))}

        {noData ? (
          <WBCard sunken padding={32}>
            <p className="text-body text-ink-400 text-center">{t('c1_emptyDashboard')}</p>
          </WBCard>
        ) : summary && (
          <>
            {/* ═══════════════════════════════════════════════
                SECTION 1: VISUAL HERO — Energy Gauge + Rings
            ═══════════════════════════════════════════════ */}
            <div className="rounded-2xl bg-gradient-to-br from-accent-900 via-accent-700 to-accent-500 p-5 mb-5 shadow-lg">
              <div className="flex items-center gap-5">
                {/* Large energy gauge */}
                <EnergyGauge value={summary.avg_energy} median={summary.median_energy} />
                {/* Mini ring KPIs */}
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <MiniRing
                    value={Math.round(summary.reporting_rate * 100)}
                    label={t('c1_participation')}
                    sub={`${summary.unique_reporters}/${summary.active_users}`}
                    color="var(--wb-teal-300)"
                  />
                  <MiniRing
                    value={summary.total_checkins}
                    max={summary.active_users * period}
                    label={t('c1_kpiCheckIns')}
                    color="var(--wb-accent-300)"
                  />
                  <MiniRing
                    value={summary.closure_publish_rate != null ? Math.round(summary.closure_publish_rate * 100) : 0}
                    label={t('c1_kpiPublishRate')}
                    color={summary.closure_publish_rate !== null && summary.closure_publish_rate < 0.5 ? '#E8A0BC' : 'var(--wb-teal-300)'}
                  />
                  <MiniRing
                    value={summary.open_alerts_count}
                    max={Math.max(summary.open_alerts_count, 10)}
                    label={t('c1_openAlerts')}
                    color={summary.open_alerts_count > 5 ? '#E8A0BC' : 'var(--wb-teal-300)'}
                    invert
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 2: ENERGY TREND CHART (area + line)
            ═══════════════════════════════════════════════ */}
            {summary.trend.length > 0 && (
              <div className="mb-5">
                <WBSectionLabel>{t('c1_energyTrend')}</WBSectionLabel>
                <WBCard padding={0} className="overflow-hidden">
                  <EnergyTrendChart trend={summary.trend} />
                </WBCard>
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 3: ROLE DISTRIBUTION — Horizontal bars
            ═══════════════════════════════════════════════ */}
            {summary.role_breakdown.length > 0 && (
              <div className="mb-5">
                <WBSectionLabel>{t('c1_distributionTitle')}</WBSectionLabel>
                <WBCard padding={16}>
                  <div className="flex flex-col gap-3">
                    {summary.role_breakdown.map(row => (
                      <RoleBar key={row.role} row={row} max={100} threshold={summary.aggregation_threshold} />
                    ))}
                  </div>
                  <p className="text-micro text-ink-400 mt-3 pt-3 border-t border-line">
                    {t('c1_thresholdFootnote', { n: `${summary.aggregation_threshold}` })}
                  </p>
                </WBCard>
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 4: DAILY ACTIVITY HEATMAP
            ═══════════════════════════════════════════════ */}
            {summary.trend.length > 0 && (
              <div className="mb-5">
                <WBSectionLabel>{t('c1_dailyTrend')}</WBSectionLabel>
                <WBCard padding={0}>
                  <ActivityHeatmap trend={summary.trend} />
                </WBCard>
              </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 5: OPEN ALERTS
            ═══════════════════════════════════════════════ */}
            <div className="mb-5">
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
          </>
        )}

        {/* Manager actions */}
        <div className="flex gap-3 mt-2 mb-8">
          <WBButton kind="primary" onClick={onOpenComposer} full>{t('c7_title')}</WBButton>
          <WBButton kind="secondary" onClick={onOpenClosures} full>{t('c8_title')}</WBButton>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   PREMIUM CHART COMPONENTS
═══════════════════════════════════════════════════════════════════════ */

/** Large circular energy gauge with gradient arc */
function EnergyGauge({ value, median }: { value: number | null; median: number | null }) {
  const v = value ?? 0
  const r = 52
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75 // 270 degrees
  const filled = arc * (v / 100)

  return (
    <div className="relative flex flex-col items-center shrink-0">
      <svg width="130" height="130" viewBox="0 0 130 130">
        {/* Background arc */}
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={`${arc} ${circ}`}
          transform="rotate(135 65 65)" />
        {/* Filled arc */}
        <circle cx="65" cy="65" r={r} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform="rotate(135 65 65)"
          className="transition-all duration-700" />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--wb-teal-300)" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
        </defs>
        {/* Center value */}
        <text x="65" y="60" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: 32 }}>
          {value != null ? Math.round(value) : '—'}
        </text>
        <text x="65" y="80" textAnchor="middle" className="fill-white/60" style={{ fontSize: 11 }}>
          {t('c1_energyGauge')}
        </text>
      </svg>
      {median != null && (
        <p className="text-[10px] text-white/50 mt-1">
          {t('c1_medianLabel')}: {Math.round(median)}
        </p>
      )}
    </div>
  )
}

/** Small circular progress ring */
function MiniRing({ value, max = 100, label, sub, color, invert }: {
  value: number; max?: number; label: string; sub?: string; color: string; invert?: boolean
}) {
  const r = 20
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const filled = circ * pct

  return (
    <div className="flex items-center gap-2.5">
      <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
          transform="rotate(-90 24 24)"
          className="transition-all duration-500" />
        <text x="24" y="27" textAnchor="middle" fill="white" style={{ fontSize: 11, fontWeight: 700 }}>
          {invert ? value : (max === 100 ? value : value)}
        </text>
      </svg>
      <div className="min-w-0">
        <p className="text-[10px] text-white/70 leading-tight truncate">{label}</p>
        {sub && <p className="text-[10px] text-white/40 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

/** Area chart with gradient fill and energy line */
function EnergyTrendChart({ trend }: { trend: { date: string; count: number; avg: number | null }[] }) {
  if (trend.length < 2) return null

  const w = 600
  const h = 160
  const padX = 40
  const padTop = 16
  const padBot = 28
  const chartW = w - padX * 2
  const chartH = h - padTop - padBot

  // Build points for energy avg line
  const points = trend.map((p, i) => {
    const x = padX + (i / (trend.length - 1)) * chartW
    const y = padTop + chartH - ((p.avg ?? 50) / 100) * chartH
    return { x, y, ...p }
  })

  // SVG path for the line
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  // Area fill path
  const areaPath = `${linePath} L${points[points.length - 1].x},${padTop + chartH} L${points[0].x},${padTop + chartH} Z`

  // Count bars (subtle)
  const maxCount = Math.max(...trend.map(d => d.count), 1)

  return (
    <div className="px-2 pt-3 pb-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: 180 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--wb-accent-500)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--wb-accent-500)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = padTop + chartH - (v / 100) * chartH
          return (
            <g key={v}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--wb-line)" strokeWidth="0.5" />
              <text x={padX - 6} y={y + 3} textAnchor="end" fill="var(--wb-ink-400)" style={{ fontSize: 9 }}>{v}</text>
            </g>
          )
        })}
        {/* Count bars (background) */}
        {trend.map((p, i) => {
          const x = padX + (i / (trend.length - 1)) * chartW
          const barH = (p.count / maxCount) * chartH * 0.3
          return (
            <rect key={`bar-${i}`} x={x - 4} y={padTop + chartH - barH} width={8} height={barH}
              rx={2} fill="var(--wb-teal-500)" opacity={0.12} />
          )
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#areaFill)" />
        {/* Energy line */}
        <path d={linePath} fill="none" stroke="var(--wb-accent-700)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--wb-surface)" stroke="var(--wb-accent-700)" strokeWidth="2" />
        ))}
        {/* Date labels */}
        {points.filter((_, i) => i % Math.max(1, Math.floor(trend.length / 7)) === 0 || i === points.length - 1).map((p, i) => (
          <text key={`dt-${i}`} x={p.x} y={h - 4} textAnchor="middle" fill="var(--wb-ink-400)" style={{ fontSize: 9 }}>
            {p.date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  )
}

/** Horizontal bar chart for role distribution */
function RoleBar({ row, max, threshold }: { row: { role: string; count: number; avg: number | null; below_threshold: boolean }; max: number; threshold: number }) {
  const width = row.avg != null ? (row.avg / max) * 100 : 0
  const isLow = row.avg != null && row.avg < 40
  const barColor = row.below_threshold
    ? 'bg-ink-200'
    : isLow
      ? 'bg-gradient-to-r from-alert-low-fg/60 to-alert-low-fg/30'
      : 'bg-gradient-to-r from-accent-700 to-accent-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-caption font-medium text-ink-900 capitalize">{row.role}</span>
        <span className="text-micro text-ink-400">
          {row.below_threshold
            ? t('c1_belowThreshold', { n: `${threshold}` })
            : `${row.avg}% (${row.count})`
          }
        </span>
      </div>
      <div className="h-2.5 bg-sunken rounded-full overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${row.below_threshold ? 0 : width}%` }}
        />
      </div>
    </div>
  )
}

/** Daily activity heatmap — shows check-in volume as colored cells */
function ActivityHeatmap({ trend }: { trend: { date: string; count: number; avg: number | null }[] }) {
  const maxCount = Math.max(...trend.map(d => d.count), 1)

  return (
    <div className="px-4 py-4">
      <div className="flex gap-[3px] items-end" style={{ minHeight: 48 }}>
        {trend.map(p => {
          const intensity = p.count / maxCount
          const alpha = 0.1 + intensity * 0.9
          return (
            <div key={p.date} className="flex-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition
                text-micro text-ink-700 bg-surface rounded-md px-2 py-0.5 shadow-md whitespace-nowrap z-10 border border-line">
                {p.avg != null ? `${p.avg}%` : '—'} · {p.count} {t('c1_kpiCheckIns').toLowerCase()}
              </div>
              <div
                className="w-full rounded-sm transition-all duration-300"
                style={{
                  height: 32,
                  backgroundColor: `rgba(61, 182, 168, ${alpha})`,
                }}
              />
              <p className="text-center text-[8px] text-ink-400 mt-1 truncate">
                {p.date.slice(8)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   EXISTING COMPONENTS (alerts, nudges)
═══════════════════════════════════════════════════════════════════════ */

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
    <div className="flex items-start gap-3 rounded-xl border-s-[3px] border-accent-700 bg-accent-50 px-4 py-3 mb-4 shadow-sm">
      <div className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 text-caption font-bold shrink-0">!</div>
      <p className="flex-1 text-caption text-ink-700">{nudge.message}</p>
      <button type="button" onClick={onDismiss} className="text-ink-400 text-caption shrink-0 px-1">x</button>
    </div>
  )
}
