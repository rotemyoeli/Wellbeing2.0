/**
 * Employee home — Phase 6B: App surface with greeting, hero CTA, trust chip, updates preview.
 *
 * The check-in flow has been extracted into CheckInPage.tsx.
 * This page is the "home tab" — the first thing employees see.
 */
import { useEffect, useState } from 'react'
import WBEmptyState from '../components/ui/WBEmptyState'
import WBFeedCard from '../components/ui/WBFeedCard'
import WBHeroCard from '../components/ui/WBHeroCard'
import WBPage from '../components/ui/WBPage'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import WBSkeletonCard from '../components/ui/WBSkeletonCard'
import WBTopBar from '../components/ui/WBTopBar'
import WBTrustHint from '../components/ui/WBTrustHint'
import WBButton from '../components/ui/WBButton'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { TeamUpdate } from '../types'

interface Props {
  onStartCheckIn: () => void
}

export default function HomePage({ onStartCheckIn }: Props) {
  const { user, logout } = useAuth()
  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(true)

  useEffect(() => {
    if (user?.department_id) {
      api.listTeamUpdates(user.department_id, 3)
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

      <div className="px-5 py-4">
        {/* Greeting */}
        <h1 className="text-h1 font-bold text-ink-900">{greeting}</h1>

        {/* Hero CTA card */}
        <div className="mt-5">
          <WBHeroCard
            title={t('b1_title')}
            subtitle={t('home_heroSub')}
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="2" width="12" height="20" rx="3" />
                <line x1="12" y1="14" x2="12" y2="18" />
              </svg>
            }
            action={
              <WBButton
                kind="secondary"
                className="!bg-white !text-accent-700 !font-semibold !border-0"
                full
                onClick={onStartCheckIn}
              >
                {t('home_heroCta')}
              </WBButton>
            }
          />
        </div>

        {/* Trust/privacy chip */}
        <div className="mt-4">
          <WBTrustHint text={t('home_trustHint')} />
        </div>

        {/* Team updates preview */}
        <div className="mt-8">
          <WBSectionLabel count={updates.length}>{t('home_updatesPreview')}</WBSectionLabel>

          {updatesLoading ? (
            <div className="flex flex-col gap-3 mt-2">
              <WBSkeletonCard lines={2} />
              <WBSkeletonCard lines={2} />
            </div>
          ) : updates.length === 0 ? (
            <WBEmptyState headline={t('b5_emptyUpdates')} />
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {updates.map((u, i) => (
                <WBFeedCard key={u.update_id} update={u} emphasized={i === 0} />
              ))}
            </div>
          )}
        </div>
      </div>
    </WBPage>
  )
}
