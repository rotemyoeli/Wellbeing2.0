/**
 * Employee home — Premium visual-first design.
 *
 * Layout:
 *   1. Visual hero with personal energy sparkline + pulse animation
 *   2. CTA card
 *   3. Trust chip
 *   4. Team updates feed in polished cards
 */
import { useEffect, useState } from 'react'
import WBButton from '../components/ui/WBButton'
import WBPage from '../components/ui/WBPage'
import WBTopBar from '../components/ui/WBTopBar'
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

  return (
    <WBPage>
      <WBTopBar
        trailing={
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-micro text-ink-400 underline no-tap-highlight">
              {t('signOut')}
            </button>
          </div>
        }
      />

      <div className="px-5 pt-3 pb-4">
        {/* ═══ VISUAL HERO ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-accent-900 via-accent-700 to-teal-700 p-5 shadow-lg mb-5">
          {/* Greeting */}
          <p className="text-white/60 text-caption font-medium">{greeting}</p>
          <h1 className="text-[22px] font-bold text-white mt-0.5 leading-tight">{user?.display_name}</h1>

          {/* Energy sparkline */}
          <div className="mt-4">
            {checkinsLoading ? (
              <div className="h-20 rounded-xl bg-white/5 skeleton-shimmer" />
            ) : myCheckins.length > 0 ? (
              <EnergySparkline checkins={myCheckins} />
            ) : (
              <div className="flex items-center justify-center h-20 rounded-xl bg-white/5">
                <p className="text-white/40 text-caption">{t('home_noReports')}</p>
              </div>
            )}
          </div>

          {/* Current energy + stats row */}
          <div className="flex items-end justify-between mt-4">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">{t('home_myEnergy')}</p>
              <p className="text-[36px] font-bold text-white leading-none mt-1">
                {lastEnergy != null ? lastEnergy : '—'}
              </p>
            </div>
            {myCheckins.length > 0 && (
              <div className="text-end">
                <p className="text-white/50 text-[10px] uppercase tracking-widest">{t('home_streak')}</p>
                <div className="flex gap-[3px] mt-1.5 justify-end">
                  {myCheckins.slice(0, 7).reverse().map((ci, i) => (
                    <div key={i} className="w-2 rounded-full" style={{
                      height: 8 + (ci.energy / 100) * 16,
                      backgroundColor: energyColor(ci.energy),
                    }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA button inside hero */}
          <WBButton
            kind="secondary"
            className="!bg-white !text-accent-700 !font-semibold !border-0 mt-5"
            full
            onClick={onStartCheckIn}
          >
            {t('home_heroCta')}
          </WBButton>
        </div>

        {/* Trust chip */}
        <WBTrustHint text={t('home_trustHint')} />

        {/* ═══ TEAM UPDATES ═══ */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <ResponseLoopIcon />
            <div>
              <p className="text-caption font-semibold text-ink-900">{t('updates_responseLoop')}</p>
              <p className="text-micro text-ink-400">{t('updates_loopSub')}</p>
            </div>
          </div>

          {updatesLoading ? (
            <div className="flex flex-col gap-3">
              <WBSkeletonCard lines={2} />
              <WBSkeletonCard lines={2} />
            </div>
          ) : updates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-sunken/50 p-6 text-center">
              <p className="text-caption text-ink-400">{t('b5_emptyUpdates')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {updates.map((u, i) => (
                <UpdateCard key={u.update_id} update={u} isLatest={i === 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </WBPage>
  )
}

/* ─── Visual components ─────────────────────────────────────────────── */

function energyColor(e: number): string {
  if (e >= 70) return 'rgba(61, 182, 168, 0.9)'   // teal
  if (e >= 40) return 'rgba(184, 159, 221, 0.9)'   // accent-300
  return 'rgba(232, 160, 188, 0.9)'                 // rose
}

/** SVG sparkline showing recent energy values as a smooth area */
function EnergySparkline({ checkins }: { checkins: CheckInListItem[] }) {
  const data = [...checkins].reverse()
  const w = 320
  const h = 72
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

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkFill)" />
      <path d={linePath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* End dot with glow */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="rgba(255,255,255,0.15)" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill="white" />
    </svg>
  )
}

/** Response loop icon */
function ResponseLoopIcon() {
  return (
    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shrink-0 shadow-sm">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  )
}

/** Premium team update card */
function UpdateCard({ update, isLatest }: { update: TeamUpdate; isLatest: boolean }) {
  const dateStr = update.published_at ? new Date(update.published_at).toLocaleDateString() : ''

  return (
    <div className={`
      rounded-xl border p-4 transition-all
      ${isLatest
        ? 'border-teal-300 bg-gradient-to-br from-teal-100/40 to-surface shadow-sm'
        : 'border-line bg-surface'
      }
    `}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={`
          w-7 h-7 rounded-full flex items-center justify-center text-micro font-bold shrink-0
          ${isLatest ? 'bg-teal-500 text-white' : 'bg-accent-100 text-accent-700'}
        `}>
          M
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-caption font-medium text-ink-700">{t('updates_fromManager')}</span>
        </div>
        <span className="text-micro text-ink-400 shrink-0">{dateStr}</span>
      </div>
      <p className="text-[14px] text-ink-700 leading-relaxed">{update.content}</p>
      {isLatest && (
        <div className="mt-2 pt-2 border-t border-teal-200/50">
          <p className="text-[10px] text-teal-600 font-medium uppercase tracking-widest">{t('b5_checkInCta')}</p>
        </div>
      )}
    </div>
  )
}
