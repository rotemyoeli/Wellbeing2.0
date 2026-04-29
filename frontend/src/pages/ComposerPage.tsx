/**
 * C7 — Team Update Composer.
 */
import { useState } from 'react'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

interface Props {
  onBack: () => void
  onPublished: () => void
}

export default function ComposerPage({ onBack, onPublished }: Props) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    if (!user?.department_id) {
      setError('No department set. Update your profile first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.createTeamUpdate(user.department_id, content.trim())
      onPublished()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6 max-w-2xl mx-auto">
      <WBBrand />

      <h1 className="text-h1 font-bold text-ink-900 mt-6">{t('c7_title')}</h1>
      <p className="text-body text-ink-500 mt-2">{t('c7_hint')}</p>

      <textarea
        className="mt-6 w-full rounded-lg border border-ink-200 bg-surface p-4 text-body text-ink-900 outline-none focus:shadow-focus focus:border-accent-700 resize-none"
        rows={6}
        maxLength={500}
        placeholder={t('c7_placeholder')}
        value={content}
        onChange={e => setContent(e.target.value.slice(0, 500))}
      />
      <p className="text-caption font-mono text-ink-400 mt-1 text-end">
        {content.length} {t('c7_counter')}
      </p>

      {/* Preview */}
      {content.trim() && (
        <div className="mt-6">
          <WBSectionLabel>Preview</WBSectionLabel>
          <WBCard padding={14}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-micro font-semibold text-teal-700">
                {user?.display_name?.[0] || 'M'}
              </div>
              <span className="text-caption font-medium text-ink-900">{user?.display_name}</span>
              <span className="text-micro text-ink-400">{t('role_manager')}</span>
            </div>
            <p className="text-[14px] text-ink-700 leading-relaxed">{content}</p>
          </WBCard>
        </div>
      )}

      {error && <p className="text-caption text-alert-low-fg mt-4">{error}</p>}

      <div className="flex-1" />

      <div className="flex gap-2 mt-6">
        <WBButton kind="ghost" onClick={onBack}>{t('b4_skip')}</WBButton>
        <WBButton kind="primary" className="flex-1" disabled={content.trim().length < 10 || loading} onClick={handlePublish}>
          {t('c7_publish')}
        </WBButton>
      </div>
    </div>
  )
}
