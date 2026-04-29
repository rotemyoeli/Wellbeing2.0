/**
 * Employee flow: B5 (home) → B1 (check-in) → B2 (thanks) → B3 (follow-up) → B4 (comment)
 */
import { useCallback, useEffect, useState } from 'react'
import BatteryMeter from '../components/BatteryMeter'
import WBAnonToggle from '../components/ui/WBAnonToggle'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { TeamUpdate } from '../types'

type Screen = 'home' | 'checkin' | 'thanks' | 'followup' | 'comment'

export default function HomePage() {
  const { user, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [energy, setEnergy] = useState(50)
  const [anon, setAnon] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkInId, setCheckInId] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<string>('')

  // Follow-up state
  const [supportQ, setSupportQ] = useState<boolean | null>(null)
  const [workloadQ, setWorkloadQ] = useState<boolean | null>(null)

  // Comment state
  const [comment, setComment] = useState('')

  // Team updates
  const [updates, setUpdates] = useState<TeamUpdate[]>([])

  useEffect(() => {
    if (user?.department_id) {
      api.listTeamUpdates(user.department_id, 5).then(r => setUpdates(r.items)).catch(() => {})
    }
  }, [user?.department_id])

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.submitCheckIn({ energy, anonMode: anon })
      setCheckInId(res.checkInId)
      setSubmittedAt(new Date().toLocaleTimeString())
      setScreen('thanks')
    } catch {
      // Error handling
    } finally {
      setLoading(false)
    }
  }, [energy, anon])

  const handleFollowUpDone = useCallback(async () => {
    if (checkInId && (supportQ !== null || workloadQ !== null)) {
      try {
        await api.updateFollowUp(checkInId, {
          supportQ: supportQ ?? undefined,
          workloadQ: workloadQ ?? undefined,
        })
      } catch {}
    }
    setScreen('comment')
  }, [checkInId, supportQ, workloadQ])

  const handleCommentSave = useCallback(async () => {
    if (checkInId && comment.trim()) {
      try {
        await api.updateComment(checkInId, comment.trim())
      } catch {}
    }
    setScreen('home')
    setCheckInId(null)
    setComment('')
    setSupportQ(null)
    setWorkloadQ(null)
  }, [checkInId, comment])

  const timeOfDay = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  })()

  // ===== B5 Home =====
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <WBBrand />
          <div className="flex items-center gap-3">
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-caption text-ink-500 underline">
              {t('signOut')}
            </button>
          </div>
        </div>

        <h1 className="text-h2 font-semibold text-ink-900 mt-6">
          {t('b5_greeting', { timeOfDay })}
        </h1>

        {/* Check-in CTA */}
        <WBCard className="mt-6 !bg-accent-700 !border-accent-700" padding={20}>
          <p className="text-white/80 text-caption">{t('b1_hint')}</p>
          <WBButton
            kind="secondary"
            className="mt-3 !bg-white !text-accent-700"
            onClick={() => setScreen('checkin')}
          >
            {t('b5_checkInCta')}
          </WBButton>
        </WBCard>

        {/* Team updates feed */}
        <div className="mt-8">
          <WBSectionLabel count={updates.length}>{t('b5_fromTeam')}</WBSectionLabel>
          {updates.length === 0 ? (
            <p className="text-caption text-ink-400">{t('b5_emptyUpdates')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {updates.map(u => (
                <WBCard key={u.update_id} padding={14}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-micro font-semibold text-teal-700">
                      M
                    </div>
                    <div>
                      <span className="text-caption font-medium text-ink-900">{t('role_manager')}</span>
                      <span className="text-micro text-ink-400 ms-2">
                        {u.published_at ? new Date(u.published_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-[14px] text-ink-700 leading-relaxed">{u.content}</p>
                </WBCard>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== B1 Check-in =====
  if (screen === 'checkin') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        <WBBrand />
        <h1 className="text-h2 font-semibold text-ink-900 mt-6">{t('b1_title')}</h1>
        <p className="text-caption text-ink-500 mt-1">{t('b1_hint')}</p>

        <div className="flex-1 flex items-center justify-center py-4">
          <BatteryMeter value={energy} onChange={setEnergy} />
        </div>

        <WBAnonToggle anon={anon} onToggle={() => setAnon(!anon)} />

        <WBButton kind="primary" full className="mt-4" onClick={handleSubmit} disabled={loading}>
          {loading ? t('b1_submitting') : t('b1_submit')}
        </WBButton>
      </div>
    )
  }

  // ===== B2 Thanks =====
  if (screen === 'thanks') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-xl bg-accent-700 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-h1 font-bold text-ink-900">{t('b2_thanks')}</h1>
        <p className="text-body text-ink-500 mt-2 text-center">{t('b2_body')}</p>
        <p className="text-caption font-mono text-ink-400 mt-4">{t('b2_time')} {submittedAt}</p>

        <WBButton kind="primary" className="mt-8" onClick={() => setScreen('followup')}>
          {t('b3_done')}
        </WBButton>
      </div>
    )
  }

  // ===== B3 Follow-up questions =====
  if (screen === 'followup') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        <WBBrand />
        <h1 className="text-h2 font-semibold text-ink-900 mt-6">{t('b3_heading')}</h1>

        <div className="flex flex-col gap-4 mt-6">
          {/* Q1 */}
          <WBCard padding={16}>
            <p className="text-body text-ink-900 mb-3">{t('b3_q1')}</p>
            <div className="flex gap-2">
              <WBButton kind={supportQ === true ? 'primary' : 'secondary'} size="sm" onClick={() => setSupportQ(true)}>{t('b3_yes')}</WBButton>
              <WBButton kind={supportQ === false ? 'primary' : 'secondary'} size="sm" onClick={() => setSupportQ(false)}>{t('b3_no')}</WBButton>
              <WBButton kind="ghost" size="sm" onClick={() => setSupportQ(null)}>{t('b3_skip')}</WBButton>
            </div>
          </WBCard>

          {/* Q2 */}
          <WBCard padding={16}>
            <p className="text-body text-ink-900 mb-3">{t('b3_q2')}</p>
            <div className="flex gap-2">
              <WBButton kind={workloadQ === true ? 'primary' : 'secondary'} size="sm" onClick={() => setWorkloadQ(true)}>{t('b3_yes')}</WBButton>
              <WBButton kind={workloadQ === false ? 'primary' : 'secondary'} size="sm" onClick={() => setWorkloadQ(false)}>{t('b3_no')}</WBButton>
              <WBButton kind="ghost" size="sm" onClick={() => setWorkloadQ(null)}>{t('b3_skip')}</WBButton>
            </div>
          </WBCard>
        </div>

        <div className="flex-1" />

        <div className="flex gap-2 mt-6">
          <WBButton kind="ghost" onClick={() => setScreen('comment')}>{t('b3_skipAll')}</WBButton>
          <WBButton kind="primary" className="flex-1" onClick={handleFollowUpDone}>{t('b3_done')}</WBButton>
        </div>
      </div>
    )
  }

  // ===== B4 Comment =====
  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
      <WBBrand />
      <h1 className="text-h2 font-semibold text-ink-900 mt-6">{t('b4_heading')}</h1>

      <textarea
        className="mt-4 w-full rounded-lg border border-ink-200 bg-surface p-3.5 text-body text-ink-900 outline-none focus:shadow-focus focus:border-accent-700 resize-none"
        rows={5}
        maxLength={300}
        placeholder={t('b4_placeholder')}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 300))}
      />
      <p className="text-caption font-mono text-ink-400 mt-1 text-end">
        {comment.length} {t('b4_counter')}
      </p>

      {anon && (
        <WBCard sunken className="mt-4 !bg-alert-low-bg !border-alert-low-border">
          <p className="text-caption text-alert-low-fg">{t('b4_anonCaveat')}</p>
        </WBCard>
      )}

      <div className="flex-1" />

      <div className="flex gap-2 mt-6">
        <WBButton kind="ghost" onClick={handleCommentSave}>{t('b4_skip')}</WBButton>
        <WBButton kind="primary" className="flex-1" onClick={handleCommentSave}>{t('b4_save')}</WBButton>
      </div>
    </div>
  )
}
