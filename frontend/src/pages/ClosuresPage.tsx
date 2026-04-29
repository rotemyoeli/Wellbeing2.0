/**
 * C8 — Review unpublished closures.
 *
 * Phase 5C: improved with error handling, publish confirmation,
 * and clearer visual hierarchy between unpublished (action needed)
 * and published (done) closures.
 */
import { useCallback, useEffect, useState } from 'react'
import WBAlertType from '../components/ui/WBAlertType'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { Alert } from '../types'

interface Props {
  onBack: () => void
}

export default function ClosuresPage({ onBack }: Props) {
  const { user } = useAuth()
  const [unpublished, setUnpublished] = useState<Alert[]>([])
  const [published, setPublished] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setError('')
    try {
      const data = await api.unpublishedClosures(14)
      setUnpublished(data.unpublished)
      setPublished(data.published)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('a1_errNet'))
    }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handlePublish = async (alert: Alert) => {
    if (!user?.department_id) return
    setPublishing(alert.alert_id)
    try {
      await api.publishClosure(alert.alert_id, user.department_id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('a1_errNet'))
    } finally {
      setPublishing(null)
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-ink-500">...</div>
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6 max-w-2xl mx-auto">
      <button type="button" onClick={onBack} className="text-caption text-accent-700 self-start mb-4">
        ← {t('c1_title')}
      </button>

      <h1 className="text-h1 font-bold text-ink-900">{t('c8_title')}</h1>
      <p className="text-body text-ink-500 mt-2">{t('c8_subtitle')}</p>

      {error && (
        <WBCard className="mt-4 !bg-alert-low-bg !border-alert-low-border">
          <p className="text-caption text-alert-low-fg">{error}</p>
        </WBCard>
      )}

      {/* Unpublished — needs attention */}
      <div className="mt-6">
        <WBSectionLabel count={unpublished.length}>{t('c8_unpublished')}</WBSectionLabel>
        {unpublished.length === 0 ? (
          <WBCard sunken padding={16}>
            <p className="text-caption text-ink-400 text-center">{t('c1_emptyAlerts')}</p>
          </WBCard>
        ) : (
          <div className="flex flex-col gap-3">
            {unpublished.map(a => (
              <WBCard key={a.alert_id} padding={14} className="!border-accent-300">
                <div className="flex items-center justify-between mb-2">
                  <WBAlertType type={a.type} label={a.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh')} />
                  <span className="text-micro text-ink-400">
                    {a.closed_at ? new Date(a.closed_at).toLocaleDateString() : ''}
                  </span>
                </div>
                {a.closure_note && (
                  <p className="text-caption text-ink-700 mb-3 leading-relaxed">{a.closure_note}</p>
                )}
                <WBButton
                  kind="primary"
                  size="sm"
                  disabled={publishing === a.alert_id}
                  onClick={() => handlePublish(a)}
                >
                  {publishing === a.alert_id ? '...' : t('c8_publish')}
                </WBButton>
              </WBCard>
            ))}
          </div>
        )}
      </div>

      {/* Published — done */}
      {published.length > 0 && (
        <div className="mt-8">
          <WBSectionLabel count={published.length}>{t('c8_published')}</WBSectionLabel>
          <div className="flex flex-col gap-3">
            {published.map(a => (
              <WBCard key={a.alert_id} sunken padding={14}>
                <div className="flex items-center justify-between mb-2">
                  <WBAlertType type={a.type} label={a.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh')} />
                  <span className="text-micro text-teal-500 font-medium">{t('c8_published')}</span>
                </div>
                {a.closure_note && (
                  <p className="text-caption text-ink-500 leading-relaxed">{a.closure_note}</p>
                )}
              </WBCard>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
