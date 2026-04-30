/**
 * Updates page — Team updates feed.
 *
 * Phase 6B: Extracted from HomePage into its own tab/route.
 * Shows all team updates for the employee's department with
 * proper loading/empty/error states.
 */
import { useEffect, useState } from 'react'
import WBEmptyState from '../components/ui/WBEmptyState'
import WBFeedCard from '../components/ui/WBFeedCard'
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
    if (!user?.department_id) {
      setLoading(false)
      return
    }
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

      <div className="px-5 py-4">
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
          <WBEmptyState
            headline={t('updates_empty')}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {updates.map((u, i) => (
              <WBFeedCard key={u.update_id} update={u} emphasized={i === 0} />
            ))}
          </div>
        )}
      </div>
    </WBPage>
  )
}
