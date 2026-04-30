/**
 * Updates page — Team updates feed (premium visual design).
 *
 * Layout:
 *   1. Visual header with response-loop animation
 *   2. Stats summary
 *   3. Polished update cards
 */
import { useEffect, useState } from 'react'
import WBEmptyState from '../components/ui/WBEmptyState'
import WBPage from '../components/ui/WBPage'
import WBSkeletonCard from '../components/ui/WBSkeletonCard'
import WBTopBar from '../components/ui/WBTopBar'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { TeamUpdate } from '../types'

export default function UpdatesPage() {
  const { user } = useAuth()
  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = () => {
    if (!user?.department_id) { setLoading(false); return }
    setLoading(true)
    setError(false)
    api.listTeamUpdates(user.department_id, 20)
      .then(r => setUpdates(r.items))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [user?.department_id])

  return (
    <WBPage>
      <WBTopBar title={t('updates_title')} />

      <div className="px-5 pt-3 pb-4">
        {/* ═══ VISUAL HEADER ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-teal-700 via-teal-500 to-accent-500 p-5 shadow-lg mb-5">
          <div className="flex items-center gap-4">
            {/* Animated loop icon */}
            <div className="relative shrink-0">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3"
                  strokeLinecap="round" strokeDasharray="40 111"
                  className="animate-spin" style={{ animationDuration: '8s' }} />
                <path d="M21 23v10l8-5z" fill="white" opacity="0.8" />
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white">{t('updates_responseLoop')}</h2>
              <p className="text-caption text-white/60 mt-1 leading-relaxed">{t('updates_loopSub')}</p>
            </div>
          </div>

          {/* Stats row */}
          {!loading && updates.length > 0 && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
              <StatPill label={t('c1_kpiCheckIns')} value={`${updates.length}`} />
              <StatPill label={t('home_lastReport')} value={
                updates[0]?.published_at
                  ? new Date(updates[0].published_at).toLocaleDateString()
                  : '—'
              } />
            </div>
          )}
        </div>

        {/* ═══ UPDATES LIST ═══ */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <WBSkeletonCard lines={3} />
            <WBSkeletonCard lines={2} />
            <WBSkeletonCard lines={3} />
          </div>
        ) : error ? (
          <WBEmptyState
            headline={t('updates_loadErr')}
            body={t('f1_netErrBody')}
            action={{ label: t('f1_retry'), onClick: refresh }}
          />
        ) : updates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-sunken/50 p-8 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-300)" strokeWidth="1.2" className="mx-auto mb-3">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-caption text-ink-400">{t('updates_empty')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {updates.map((u, i) => (
              <TimelineUpdateCard key={u.update_id} update={u} isLatest={i === 0} showLine={i < updates.length - 1} />
            ))}
          </div>
        )}
      </div>
    </WBPage>
  )
}

/** Stat pill inside the hero */
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg bg-white/10 px-3 py-2 text-center">
      <p className="text-[10px] text-white/50 uppercase tracking-widest">{label}</p>
      <p className="text-[15px] font-bold text-white mt-0.5">{value}</p>
    </div>
  )
}

/** Timeline-style update card with vertical connector */
function TimelineUpdateCard({ update, isLatest, showLine }: { update: TeamUpdate; isLatest: boolean; showLine: boolean }) {
  const dateStr = update.published_at ? new Date(update.published_at).toLocaleDateString() : ''

  return (
    <div className="flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div className={`w-3 h-3 rounded-full ${isLatest ? 'bg-teal-500 shadow-md' : 'bg-accent-300'}`} />
        {showLine && <div className="w-0.5 flex-1 bg-line mt-1" />}
      </div>
      {/* Card */}
      <div className={`
        flex-1 rounded-xl border p-4 mb-1 transition-all
        ${isLatest
          ? 'border-teal-300 bg-gradient-to-br from-teal-100/30 to-surface shadow-sm'
          : 'border-line bg-surface hover:shadow-sm'
        }
      `}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
              ${isLatest ? 'bg-teal-500 text-white' : 'bg-accent-100 text-accent-700'}`}>
              M
            </div>
            <span className="text-caption font-medium text-ink-700">{t('updates_fromManager')}</span>
          </div>
          <span className="text-micro text-ink-400">{dateStr}</span>
        </div>
        <p className="text-[14px] text-ink-700 leading-relaxed">{update.content}</p>
      </div>
    </div>
  )
}
