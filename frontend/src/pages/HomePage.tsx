/**
 * Employee home — Premium visual-first design.
 *
 * Layout:
 *   1. Full-width gradient hero with radial gauge + sparkline + rhythm bars
 *   2. Two stat cards row
 *   3. Trust chip
 *   4. Team updates in visual timeline wrapper
 */
import { useEffect, useState } from 'react'
import WBButton from '../components/ui/WBButton'
import WBDarkModeToggle from '../components/ui/WBDarkModeToggle'
import WBLangSwitcher from '../components/ui/WBLangSwitcher'
import WBInstallPrompt from '../components/ui/WBInstallPrompt'
import WBNotifPrompt from '../components/ui/WBNotifPrompt'
import WBPage from '../components/ui/WBPage'
import WBReactionBar from '../components/ui/WBReactionBar'
import WBTopBar from '../components/ui/WBTopBar'
import WBTransparencySheet from '../components/ui/WBTransparencySheet'
import WBTrustHint from '../components/ui/WBTrustHint'
import WBSkeletonCard from '../components/ui/WBSkeletonCard'
import { useAuth } from '../contexts/AuthContext'
import { api, type CheckInListItem } from '../lib/api'
import { t } from '../lib/i18n'
import type { TeamUpdate } from '../types'

interface Props {
  onStartCheckIn: () => void
}

export default function HomePage({ onStartCheckIn }: Props) {
  const { user, logout } = useAuth()
  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(true)
  const [myCheckins, setMyCheckins] = useState<CheckInListItem[]>([])
  const [checkinsLoading, setCheckinsLoading] = useState(true)
  const [showTransparency, setShowTransparency] = useState(false)

  useEffect(() => {
    api.listMyCheckIns()
      .then(r => setMyCheckins(r.items.slice(0, 14)))
      .catch(() => {})
      .finally(() => setCheckinsLoading(false))
  }, [])

  useEffect(() => {
    if (user?.department_id) {
      api.listTeamUpdates(user.department_id, 5)
        .then(r => setUpdates(r.items))
        .catch(() => {})
        .finally(() => setUpdatesLoading(false))
    } else {
      setUpdatesLoading(false)
    }
  }, [user?.department_id])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t('home_greeting_morning')
    if (h < 17) return t('home_greeting_afternoon')
    return t('home_greeting_evening')
  })()

  const lastEnergy = myCheckins.length > 0 ? myCheckins[0].energy : null
  const avgEnergy = myCheckins.length > 0
    ? Math.round(myCheckins.reduce((s, c) => s + c.energy, 0) / myCheckins.length)
    : null
  const reportedToday = myCheckins.length > 0 && new Date(myCheckins[0].created_at).toDateString() === new Date().toDateString()

  // Weekly tip (#6)
  const weeklyTip = (() => {
    if (myCheckins.length === 0) return null
    if (myCheckins.length === 1) return t('tip_first')
    const recent = myCheckins.slice(0, 7)
    const older = myCheckins.slice(7, 14)
    if (older.length === 0) return t('tip_stable')
    const recentAvg = recent.reduce((s, c) => s + c.energy, 0) / recent.length
    const olderAvg = older.reduce((s, c) => s + c.energy, 0) / older.length
    const diff = Math.round(recentAvg - olderAvg)
    if (diff > 3) return t('tip_up', { n: `${diff}` })
    if (diff < -3) return t('tip_down', { n: `${Math.abs(diff)}` })
    return t('tip_stable')
  })()

  return (
    <WBPage>
      <WBTopBar
        trailing={
          <div className="flex items-center gap-1.5">
            <WBLangSwitcher />
            <WBDarkModeToggle />
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-micro text-ink-400 underline no-tap-highlight">
              {t('signOut')}
            </button>
          </div>
        }
      />

      <div className="px-5 pt-3 pb-4">
        <WBInstallPrompt />
        <WBNotifPrompt />

        {/* ═══════════════════════════════════════
            SECTION 1: VISUAL HERO
        ═══════════════════════════════════════ */}
        <div className="rounded-2xl bg-gradient-to-br from-accent-900 via-accent-700 to-teal-700 p-5 shadow-lg mb-4 overflow-hidden relative">
          {/* Background decorative rings */}
          <div className="absolute -top-12 -end-12 w-40 h-40 rounded-full border border-white/5" />
          <div className="absolute -top-6 -end-6 w-28 h-28 rounded-full border border-white/5" />

          {/* Greeting row */}
          <div className="flex items-center gap-2">
            <p className="text-white/50 text-micro uppercase tracking-widest">{greeting}</p>
            {reportedToday && (
              <span className="text-[8px] font-semibold text-teal-300 bg-teal-700/40 px-1.5 py-0.5 rounded-pill flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                {t('reported_today')}
              </span>
            )}
          </div>
          <h1 className="text-[20px] font-bold text-white mt-1 leading-tight">{user?.display_name}</h1>

          {/* Main visual: gauge + sparkline side by side */}
          <div className="flex items-center gap-4 mt-5">
            {/* Radial gauge */}
            <div className="shrink-0">
              {checkinsLoading ? (
                <div className="w-[110px] h-[110px] rounded-full bg-white/5 skeleton-shimmer" />
              ) : (
                <EnergyGauge value={lastEnergy} avg={avgEnergy} />
              )}
            </div>

            {/* Sparkline + rhythm bars */}
            <div className="flex-1 min-w-0">
              {checkinsLoading ? (
                <div className="h-16 rounded-xl bg-white/5 skeleton-shimmer" />
              ) : myCheckins.length >= 2 ? (
                <EnergySparkline checkins={myCheckins} />
              ) : (
                <div className="flex items-center justify-center h-16 rounded-xl bg-white/5">
                  <p className="text-white/40 text-micro px-3 text-center">{t('home_noReports')}</p>
                </div>
              )}
              {/* Weekly rhythm bars */}
              {myCheckins.length > 0 && (
                <div className="flex gap-[3px] mt-3 justify-start">
                  {myCheckins.slice(0, 7).reverse().map((ci, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="w-[6px] rounded-full transition-all" style={{
                        height: 6 + (ci.energy / 100) * 18,
                        backgroundColor: energyColor(ci.energy),
                      }} />
                      <span className="text-[7px] text-white/30">{dayLabel(ci.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CTA button */}
          <WBButton
            kind="secondary"
            className="!bg-white !text-accent-700 !font-semibold !border-0 mt-5"
            full
            onClick={onStartCheckIn}
          >
            {t('home_heroCta')}
          </WBButton>
        </div>

        {/* ═══════════════════════════════════════
            SECTION 2: STAT CARDS
        ═══════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatCard
            icon={<BatteryIcon />}
            label={t('home_myEnergy')}
            value={lastEnergy != null ? `${lastEnergy}` : '—'}
            sub={avgEnergy != null ? `${t('c1_weeklyAvg')}: ${avgEnergy}` : undefined}
            accent={lastEnergy != null && lastEnergy >= 50}
          />
          <StatCard
            icon={<ReportIcon />}
            label={t('home_streak')}
            value={`${myCheckins.length}`}
            sub={t('home_reportsCount', { n: `${myCheckins.length}` })}
            accent
          />
        </div>

        {/* Loop counter (idea 15) */}
        {updates.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <p className="text-micro text-teal-700 font-medium">{t('loop_closed_count', { n: `${updates.length}` })}</p>
          </div>
        )}

        {/* Response loop visualization (ideas 14+15) */}
        {updates.length > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-teal-100/40 to-surface border border-teal-300/50 p-4 mb-4">
            <p className="text-micro text-teal-700 font-semibold uppercase tracking-widest mb-3">{t('loop_title')}</p>
            <div className="flex items-center gap-0">
              {/* Step 1: Reports */}
              <div className="flex-1 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-accent-700 flex items-center justify-center mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                </div>
                <p className="text-[9px] text-ink-500">{t('loop_reported')}</p>
              </div>
              {/* Arrow */}
              <div className="w-6 h-0.5 bg-teal-300 shrink-0" />
              {/* Step 2: Manager responded */}
              <div className="flex-1 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-teal-500 flex items-center justify-center mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </div>
                <p className="text-[9px] text-ink-500">{t('loop_responded')}</p>
              </div>
              {/* Arrow */}
              <div className="w-6 h-0.5 bg-teal-300 shrink-0" />
              {/* Step 3: Team felt change */}
              <div className="flex-1 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-teal-700 flex items-center justify-center mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <p className="text-[9px] text-ink-500">{t('loop_felt')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Personal history (idea 6) — compact energy timeline */}
        {myCheckins.length > 2 && (
          <div className="rounded-xl border border-line bg-surface p-4 mb-4">
            <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-2">{t('history_title')}</p>
            <div className="flex items-end gap-[3px]" style={{ height: 40 }}>
              {myCheckins.slice(0, 14).reverse().map((ci, i) => (
                <div key={i} className="flex-1 rounded-t-sm transition-all" style={{
                  height: 6 + (ci.energy / 100) * 34,
                  backgroundColor: energyColor(ci.energy),
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-ink-400">{myCheckins.length > 1 ? new Date(myCheckins[myCheckins.length-1].created_at).toLocaleDateString() : ''}</span>
              <span className="text-[8px] text-ink-400">{t('home_lastReport')}</span>
            </div>
          </div>
        )}

        {/* Weekly tip (#6) */}
        {weeklyTip && (
          <div className="flex items-center gap-2 rounded-xl bg-accent-50 border border-accent-100 px-4 py-2.5 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="2" strokeLinecap="round"><path d="M9 18h6M10 22h4M12 2v1M4.22 4.22l.71.71M1 12h1M4.22 19.78l.71-.71M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" /></svg>
            <p className="text-micro text-accent-700 font-medium">{weeklyTip}</p>
          </div>
        )}

        {/* Monthly summary (#9) */}
        {myCheckins.length >= 5 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-gradient-to-br from-accent-50 to-surface border border-accent-100 p-3 text-center">
              <p className="text-[18px] font-bold text-ink-900">{myCheckins.length}</p>
              <p className="text-[8px] text-ink-400 uppercase tracking-widest">{t('monthly_reports')}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-teal-100 to-surface border border-line p-3 text-center">
              <p className="text-[18px] font-bold text-ink-900">{avgEnergy ?? '—'}</p>
              <p className="text-[8px] text-ink-400 uppercase tracking-widest">{t('monthly_avgEnergy')}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-accent-50 to-surface border border-accent-100 p-3 text-center">
              <p className="text-[18px] font-bold text-ink-900">
                {(() => { const best = myCheckins.reduce((b, c) => c.energy > b.energy ? c : b, myCheckins[0]); return ['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(best.created_at).getDay()] })()}
              </p>
              <p className="text-[8px] text-ink-400 uppercase tracking-widest">{t('monthly_bestDay')}</p>
            </div>
          </div>
        )}

        {/* Trust chip — tappable to open transparency sheet */}
        <button type="button" onClick={() => setShowTransparency(true)} className="w-full text-start no-tap-highlight">
          <WBTrustHint text={t('home_trustHint')} />
        </button>
        <WBTransparencySheet open={showTransparency} onClose={() => setShowTransparency(false)} />

        {/* ═══════════════════════════════════════
            SECTION 3: TEAM UPDATES
        ═══════════════════════════════════════ */}
        <div className="mt-6">
          {/* Section header with visual accent */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-ink-900">{t('updates_responseLoop')}</p>
              <p className="text-micro text-ink-400 leading-snug">{t('updates_loopSub')}</p>
            </div>
          </div>

          {updatesLoading ? (
            <div className="flex flex-col gap-3">
              <WBSkeletonCard lines={2} />
              <WBSkeletonCard lines={2} />
            </div>
          ) : updates.length === 0 ? (
            <EmptyUpdatesCard />
          ) : (
            <div className="rounded-2xl border border-line bg-surface overflow-hidden shadow-sm">
              {updates.map((u, i) => (
                <UpdateRow key={u.update_id} update={u} isLatest={i === 0} isLast={i === updates.length - 1} />
              ))}
            </div>
          )}
        </div>

        {/* System status (#14) */}
        <div className="mt-6 flex items-center justify-center gap-2 py-3">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-micro text-ink-400">{t('status_live')}</span>
        </div>
      </div>
    </WBPage>
  )
}

/* ═══════════════════════════════════════════════════════════════
   VISUAL COMPONENTS
═══════════════════════════════════════════════════════════════ */

function energyColor(e: number): string {
  if (e >= 70) return 'rgba(61, 182, 168, 0.9)'
  if (e >= 40) return 'rgba(184, 159, 221, 0.9)'
  return 'rgba(232, 160, 188, 0.9)'
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()] || ''
}

/** Radial gauge showing current energy with arc */
function EnergyGauge({ value, avg }: { value: number | null; avg: number | null }) {
  const v = value ?? 0
  const r = 42
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75
  const filled = arc * (v / 100)

  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      {/* Background arc */}
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${arc} ${circ}`} transform="rotate(135 55 55)" />
      {/* Filled arc */}
      <circle cx="55" cy="55" r={r} fill="none" stroke="url(#homeGaugeGrad)" strokeWidth="8"
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`} transform="rotate(135 55 55)"
        className="transition-all duration-700" />
      <defs>
        <linearGradient id="homeGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--wb-teal-300)" />
          <stop offset="100%" stopColor="white" />
        </linearGradient>
      </defs>
      {/* Center number */}
      <text x="55" y="52" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: 26 }}>
        {value != null ? value : '—'}
      </text>
      <text x="55" y="68" textAnchor="middle" className="fill-white/50" style={{ fontSize: 9 }}>
        {t('home_myEnergy')}
      </text>
      {/* Avg marker */}
      {avg != null && (
        <text x="55" y="82" textAnchor="middle" className="fill-white/35" style={{ fontSize: 8 }}>
          {t('c1_weeklyAvg')}: {avg}
        </text>
      )}
    </svg>
  )
}

/** SVG sparkline with glow end-dot */
function EnergySparkline({ checkins }: { checkins: CheckInListItem[] }) {
  const data = [...checkins].reverse()
  const w = 240
  const h = 64
  const padX = 4
  const padY = 6
  const chartW = w - padX * 2
  const chartH = h - padY * 2

  if (data.length < 2) return null

  const points = data.map((ci, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padY + chartH - (ci.energy / 100) * chartH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${h} L${points[0].x},${h} Z`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 64 }} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="homeSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id="dotGlow">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path d={areaPath} fill="url(#homeSpark)" />
      <path d={linePath} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Glow on last point */}
      <circle cx={last.x} cy={last.y} r="8" fill="url(#dotGlow)" />
      <circle cx={last.x} cy={last.y} r="3" fill="white" />
    </svg>
  )
}

/** Glassmorphic stat card */
function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className={`
      rounded-xl p-4 border
      ${accent
        ? 'bg-gradient-to-br from-accent-50 to-surface border-accent-100 shadow-sm'
        : 'bg-surface border-line'
      }
    `}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center
          ${accent ? 'bg-accent-100' : 'bg-sunken'}`}>
          {icon}
        </div>
        <span className="text-micro text-ink-400 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[28px] font-bold text-ink-900 leading-none">{value}</p>
      {sub && <p className="text-micro text-ink-400 mt-1">{sub}</p>}
    </div>
  )
}

function BatteryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <line x1="12" y1="14" x2="12" y2="18" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

/** Empty updates — visual placeholder */
function EmptyUpdatesCard() {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-gradient-to-br from-sunken/50 to-surface p-8 text-center">
      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-sunken flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-300)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p className="text-caption text-ink-400 leading-relaxed max-w-[260px] mx-auto">{t('b5_emptyUpdates')}</p>
    </div>
  )
}

/** Update row inside a unified card container */
function UpdateRow({ update, isLatest, isLast }: { update: TeamUpdate; isLatest: boolean; isLast: boolean }) {
  const dateStr = update.published_at ? new Date(update.published_at).toLocaleDateString() : ''

  return (
    <div className={`px-4 py-3.5 ${!isLast ? 'border-b border-line' : ''} ${isLatest ? 'bg-gradient-to-r from-teal-100/30 to-transparent' : ''}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
          ${isLatest ? 'bg-teal-500 text-white' : 'bg-accent-100 text-accent-700'}`}>
          M
        </div>
        <span className="text-caption font-medium text-ink-700 flex-1">{t('updates_fromManager')}</span>
        <span className="text-micro text-ink-400">{dateStr}</span>
        {isLatest && (
          <span className="text-[9px] font-semibold text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-pill uppercase tracking-wider">New</span>
        )}
      </div>
      <p className="text-[14px] text-ink-700 leading-relaxed">{update.content}</p>
      <WBReactionBar updateId={update.update_id} />
    </div>
  )
}
