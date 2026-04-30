/**
 * C7 — Team Update Composer.
 */
import { useEffect, useState } from 'react'
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
  const [deptId, setDeptId] = useState(user?.department_id || '')
  const [depts, setDepts] = useState<{ slug: string; name: string }[]>([])

  // For admins without a department, load available departments
  useEffect(() => {
    if (!user?.department_id && user?.role === 'admin') {
      api.adminGetStats().then(r => {
        const deptList = (r.departments as { slug: string; name: string }[]) || []
        if (deptList.length > 0) {
          setDepts(deptList)
          if (!deptId) setDeptId(deptList[0].slug)
        }
      }).catch(() => {})
    }
  }, [user?.department_id, user?.role])

  const targetDept = user?.department_id || deptId

  const handlePublish = async () => {
    if (!targetDept) {
      setError(t('a1_errNet'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.createTeamUpdate(targetDept, content.trim())
      onPublished()
    } catch (e) {
      setError(t('b1_errNet'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6 max-w-2xl mx-auto">
      <WBBrand />

      <h1 className="text-h1 font-bold text-ink-900 mt-6">{t('c7_title')}</h1>
      <p className="text-body text-ink-500 mt-2">{t('c7_hint')}</p>

      {/* Department selector for admins without a department */}
      {!user?.department_id && depts.length > 0 && (
        <select
          className="mt-4 rounded-xl border border-line bg-surface px-3 py-2.5 text-caption outline-none focus:border-accent-700"
          value={deptId}
          onChange={e => setDeptId(e.target.value)}
        >
          {depts.map(d => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
      )}

      {/* Quick templates (#10) */}
      {!content && (
        <div className="mt-4 mb-2">
          <p className="text-micro text-ink-400 font-semibold uppercase tracking-widest mb-2">{t('template_title')}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setContent(t(`template_${n}`))}
                className="shrink-0 max-w-[200px] rounded-xl border border-line bg-surface p-3 text-start no-tap-highlight hover:shadow-sm transition">
                <p className="text-micro text-ink-700 line-clamp-2 leading-snug">{t(`template_${n}`).slice(0, 60)}...</p>
                <p className="text-[9px] text-accent-700 font-medium mt-1">{t('template_use')}</p>
              </button>
            ))}
          </div>
        </div>
      )}

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
          <WBSectionLabel>{t('c7_preview')}</WBSectionLabel>
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

      {/* Schedule selector (idea 12) */}
      <div className="mt-4">
        <p className="text-micro text-ink-400 mb-1.5">{t('schedule_publish')}</p>
        <div className="flex gap-2">
          <button type="button" className="flex-1 py-1.5 rounded-xl text-micro font-medium bg-accent-700 text-white border border-accent-700 no-tap-highlight">
            {t('schedule_now')}
          </button>
          <button type="button" className="flex-1 py-1.5 rounded-xl text-micro font-medium bg-surface text-ink-500 border border-line no-tap-highlight opacity-50" disabled>
            {t('schedule_tomorrow')}
          </button>
        </div>
      </div>

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
