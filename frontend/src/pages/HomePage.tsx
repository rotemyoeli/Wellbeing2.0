/**
 * Employee flow — Phase 5B UX hardening
 *
 * Flow: B5 (home) → B1 (battery) → [optional: B3 follow-up → B4 comment] → submit → B2 (thanks)
 *
 * Design goals (from HANDOFF.md):
 * - Under 15 seconds for quick submit (energy only)
 * - Optional steps are clearly optional with calm skip affordance
 * - Anonymous mode is default
 * - Single POST at the end with all collected data
 * - "Your voice matters" success state without gamification
 * - Team updates feed with clear hierarchy
 */
import { useCallback, useEffect, useState } from 'react'
import BatteryMeter from '../components/BatteryMeter'
import FacesMeter from '../components/FacesMeter'
import OrbMeter from '../components/OrbMeter'
import WBAnonToggle from '../components/ui/WBAnonToggle'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { TeamUpdate } from '../types'

type Screen = 'home' | 'checkin' | 'followup' | 'comment' | 'submitting' | 'thanks' | 'error'
type CheckInVariant = 'battery' | 'orb' | 'faces'

function getSavedVariant(): CheckInVariant {
  const saved = localStorage.getItem('wellbeing.variant')
  if (saved === 'orb' || saved === 'faces') return saved
  return 'battery'
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('home')
  const [energy, setEnergy] = useState(50)
  const [anon, setAnon] = useState(true)
  const [submittedAt, setSubmittedAt] = useState('')
  const [variant, setVariant] = useState<CheckInVariant>(getSavedVariant)

  const changeVariant = (v: CheckInVariant) => {
    setVariant(v)
    localStorage.setItem('wellbeing.variant', v)
  }
  const [errorMsg, setErrorMsg] = useState('')

  // Collected across screens, submitted once
  const [supportQ, setSupportQ] = useState<boolean | null>(null)
  const [workloadQ, setWorkloadQ] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')

  // Team updates
  const [updates, setUpdates] = useState<TeamUpdate[]>([])
  const [updatesLoading, setUpdatesLoading] = useState(true)

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

  /** Single final POST with all collected data */
  const handleSubmit = useCallback(async () => {
    setScreen('submitting')
    setErrorMsg('')
    try {
      await api.submitCheckIn({
        energy,
        anonMode: anon,
        supportQ: supportQ ?? undefined,
        workloadQ: workloadQ ?? undefined,
        comment: comment.trim() || undefined,
      })
      setSubmittedAt(new Date().toLocaleTimeString())
      setScreen('thanks')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('a1_errNet'))
      setScreen('error')
    }
  }, [energy, anon, supportQ, workloadQ, comment])

  const resetFlow = () => {
    setScreen('home')
    setEnergy(50)
    setComment('')
    setSupportQ(null)
    setWorkloadQ(null)
    setErrorMsg('')
  }

  const timeOfDay = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
  })()

  // ===== Submitting =====
  if (screen === 'submitting') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin mb-4" />
        <p className="text-body text-ink-500">{t('b1_submitting')}</p>
      </div>
    )
  }

  // ===== Error =====
  if (screen === 'error') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-14 h-14 rounded-lg border border-line bg-surface flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-500)" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-h3 font-semibold text-ink-900 text-center">{t('f1_netErr')}</h1>
        <p className="text-body text-ink-500 text-center mt-2 max-w-[300px]">{errorMsg}</p>
        <div className="flex gap-3 mt-6">
          <WBButton kind="primary" onClick={handleSubmit}>{t('f1_retry')}</WBButton>
          <WBButton kind="ghost" onClick={resetFlow}>{t('f3_home')}</WBButton>
        </div>
      </div>
    )
  }

  // ===== B2 Thanks — reinforces "your voice matters" without gamification =====
  if (screen === 'thanks') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-xl bg-teal-500 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-h1 font-bold text-ink-900">{t('b2_thanks')}</h1>
        <p className="text-body text-ink-500 mt-3 text-center max-w-[280px]">{t('b2_body')}</p>
        <p className="text-caption font-mono text-ink-400 mt-4">{t('b2_time')} {submittedAt}</p>

        <div className="flex-1" />

        <WBButton kind="primary" full onClick={resetFlow} className="mt-6">
          {t('f3_home')}
        </WBButton>
      </div>
    )
  }

  // ===== B5 Home — team updates with hierarchy =====
  if (screen === 'home') {
    const latestUpdate = updates[0]
    const pastUpdates = updates.slice(1)

    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <WBBrand />
          <div className="flex items-center gap-3">
            <span className="text-caption text-ink-500">{user?.display_name}</span>
            <button type="button" onClick={logout} className="text-caption text-ink-500 underline">{t('signOut')}</button>
          </div>
        </div>

        <h1 className="text-h2 font-semibold text-ink-900 mt-6">
          {t('b5_greeting', { timeOfDay })}
        </h1>

        {/* Check-in CTA — prominent, inviting */}
        <WBCard className="mt-6 !bg-accent-700 !border-accent-700" padding={20}>
          <p className="text-[15px] text-white/90 font-medium">{t('b1_title')}</p>
          <p className="text-caption text-white/60 mt-1">{t('b1_hint')}</p>
          <WBButton
            kind="secondary"
            className="mt-4 !bg-white !text-accent-700 !font-semibold"
            full
            onClick={() => setScreen('checkin')}
          >
            {t('b5_checkInCta')}
          </WBButton>
        </WBCard>

        {/* Team updates feed — latest emphasized, past muted */}
        <div className="mt-8">
          <WBSectionLabel count={updates.length}>{t('b5_fromTeam')}</WBSectionLabel>

          {updatesLoading ? (
            <p className="text-caption text-ink-400 py-4">...</p>
          ) : updates.length === 0 ? (
            <WBCard sunken padding={20}>
              <p className="text-caption text-ink-400 text-center">{t('b5_emptyUpdates')}</p>
            </WBCard>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Latest update — emphasized */}
              {latestUpdate && (
                <WBCard padding={16} className="!border-accent-300 !border-[1.5px] !bg-accent-50">
                  <UpdateContent update={latestUpdate} />
                </WBCard>
              )}
              {/* Past updates — muted */}
              {pastUpdates.map(u => (
                <WBCard key={u.update_id} padding={14} sunken>
                  <UpdateContent update={u} />
                </WBCard>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ===== B1 Check-in — with 3-variant chooser =====
  if (screen === 'checkin') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 pt-6 pb-safe">
        <div className="flex items-center justify-between">
          <WBBrand />
          {/* Variant chooser — persisted in localStorage */}
          <div className="flex gap-1 bg-sunken rounded-pill p-0.5">
            {(['battery', 'orb', 'faces'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => changeVariant(v)}
                className={`px-2.5 py-1 rounded-pill text-micro font-medium transition ${
                  variant === v ? 'bg-accent-700 text-white' : 'text-ink-500'
                }`}
              >
                {t(v === 'battery' ? 'variant_a' : v === 'orb' ? 'variant_b' : 'variant_c')}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-h2 font-semibold text-ink-900 mt-4">{t('b1_title')}</h1>
        <p className="text-caption text-ink-400 mt-1">{t('b1_hint')}</p>

        {/* Selected meter variant — centered */}
        <div className="flex-1 flex items-center justify-center py-2">
          {variant === 'battery' && <BatteryMeter value={energy} onChange={setEnergy} />}
          {variant === 'orb' && <OrbMeter value={energy} onChange={setEnergy} />}
          {variant === 'faces' && <FacesMeter value={energy} onChange={setEnergy} />}
        </div>

        {/* Anon toggle */}
        <WBAnonToggle anon={anon} onToggle={() => setAnon(!anon)} />

        {/* Primary: quick submit (15s path). Secondary: add more detail */}
        <WBButton kind="primary" full className="mt-4" onClick={handleSubmit}>
          {t('b1_submit')}
        </WBButton>
        <button
          type="button"
          onClick={() => setScreen('followup')}
          className="text-caption text-accent-700 text-center mt-3 py-2"
        >
          {t('b4_heading')}
        </button>
      </div>
    )
  }

  // ===== B3 Follow-up — clearly optional =====
  if (screen === 'followup') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        <WBBrand />
        <h1 className="text-h2 font-semibold text-ink-900 mt-6">{t('b3_heading')}</h1>
        <p className="text-caption text-ink-400 mt-1">{t('b4_placeholder')}</p>

        <div className="flex flex-col gap-4 mt-6">
          <WBCard padding={16}>
            <p className="text-body text-ink-900 mb-3">{t('b3_q1')}</p>
            <div className="flex gap-2">
              <WBButton kind={supportQ === true ? 'primary' : 'secondary'} size="sm" onClick={() => setSupportQ(true)}>{t('b3_yes')}</WBButton>
              <WBButton kind={supportQ === false ? 'primary' : 'secondary'} size="sm" onClick={() => setSupportQ(false)}>{t('b3_no')}</WBButton>
              <WBButton kind="ghost" size="sm" onClick={() => setSupportQ(null)}>{t('b3_skip')}</WBButton>
            </div>
          </WBCard>

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
          <WBButton kind="ghost" onClick={handleSubmit}>{t('b1_submit')}</WBButton>
          <WBButton kind="primary" className="flex-1" onClick={() => setScreen('comment')}>{t('b3_done')}</WBButton>
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
        rows={4}
        maxLength={300}
        placeholder={t('b4_placeholder')}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 300))}
        dir="auto"
      />
      <p className="text-caption font-mono text-ink-400 mt-1 text-end">
        {comment.length} {t('b4_counter')}
      </p>

      {anon && (
        <WBCard sunken className="mt-3 !bg-accent-50 !border-accent-100">
          <p className="text-caption text-ink-500">{t('b4_anonCaveat')}</p>
        </WBCard>
      )}

      <div className="flex-1" />

      <div className="flex gap-2 mt-6">
        <WBButton kind="ghost" onClick={handleSubmit}>{t('b1_submit')}</WBButton>
        <WBButton kind="primary" className="flex-1" onClick={handleSubmit}>{t('b4_save')}</WBButton>
      </div>
    </div>
  )
}

/** Reusable team update content block */
function UpdateContent({ update }: { update: TeamUpdate }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-micro font-semibold text-teal-700 shrink-0">
          M
        </div>
        <span className="text-caption font-medium text-ink-700">{t('role_manager')}</span>
        <span className="text-micro text-ink-400 ms-auto">
          {update.published_at ? new Date(update.published_at).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="text-[14px] text-ink-700 leading-relaxed">{update.content}</p>
    </>
  )
}
