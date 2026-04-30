/**
 * Check-in flow — Phase 6B: Extracted from HomePage into its own full-screen route.
 *
 * Flow: B1 (battery/orb/faces) → [optional: B3 follow-up → B4 comment] → submit → B2 (thanks)
 *
 * This page runs as a full-screen flow without the bottom nav.
 * On completion or cancel, navigates back to home.
 */
import { useCallback, useState } from 'react'
import BatteryMeter from '../components/BatteryMeter'
import FacesMeter from '../components/FacesMeter'
import OrbMeter from '../components/OrbMeter'
import WBAnonToggle from '../components/ui/WBAnonToggle'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

type Screen = 'checkin' | 'followup' | 'comment' | 'submitting' | 'thanks' | 'error'
type CheckInVariant = 'battery' | 'orb' | 'faces'

function getSavedVariant(): CheckInVariant {
  const saved = localStorage.getItem('wellbeing.variant')
  if (saved === 'orb' || saved === 'faces') return saved
  return 'battery'
}

interface Props {
  onDone: () => void
}

export default function CheckInPage({ onDone }: Props) {
  const [screen, setScreen] = useState<Screen>('checkin')
  const [energy, setEnergy] = useState(50)
  const [anon, setAnon] = useState(true)
  const [submittedAt, setSubmittedAt] = useState('')
  const [variant, setVariant] = useState<CheckInVariant>(getSavedVariant)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitLock, setSubmitLock] = useState(false)

  const changeVariant = (v: CheckInVariant) => {
    setVariant(v)
    localStorage.setItem('wellbeing.variant', v)
  }

  // Collected across screens, submitted once
  const [supportQ, setSupportQ] = useState<boolean | null>(null)
  const [workloadQ, setWorkloadQ] = useState<boolean | null>(null)
  const [comment, setComment] = useState('')

  /** Single final POST with all collected data */
  const handleSubmit = useCallback(async () => {
    if (submitLock) return
    setSubmitLock(true)
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
    } catch {
      setErrorMsg(t('b1_errNet'))
      setScreen('error')
    } finally {
      setSubmitLock(false)
    }
  }, [energy, anon, supportQ, workloadQ, comment, submitLock])

  // ===== Submitting =====
  if (screen === 'submitting') {
    return (
      <div className="min-h-app bg-paper flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 rounded-full border-2 border-accent-300 border-t-accent-700 animate-spin mb-4" />
        <p className="text-body text-ink-500">{t('b1_submitting')}</p>
      </div>
    )
  }

  // ===== Error =====
  if (screen === 'error') {
    return (
      <div className="min-h-app bg-paper flex flex-col items-center justify-center px-6 pb-safe pt-safe">
        <div className="w-16 h-16 rounded-xl border border-line bg-surface flex items-center justify-center mb-6 shadow-sm">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-h3 font-semibold text-ink-900 text-center">{t('f1_netErrTitle')}</h1>
        <p className="text-body text-ink-500 text-center mt-3 max-w-[320px] leading-relaxed">{errorMsg}</p>
        <div className="flex gap-3 mt-8">
          <WBButton kind="primary" onClick={handleSubmit}>{t('f1_retry')}</WBButton>
          <WBButton kind="secondary" onClick={onDone}>{t('f3_home')}</WBButton>
        </div>
      </div>
    )
  }

  // ===== B2 Thanks =====
  if (screen === 'thanks') {
    return (
      <div className="min-h-app bg-paper flex flex-col items-center justify-center px-6 py-8">
        <div className="w-16 h-16 rounded-xl bg-teal-500 flex items-center justify-center mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-h1 font-bold text-ink-900">{t('b2_thanks')}</h1>
        <p className="text-body text-ink-500 mt-3 text-center max-w-[280px]">{t('b2_body')}</p>
        <p className="text-caption font-mono text-ink-400 mt-4">{submittedAt}</p>

        <div className="flex-1" />

        <WBButton kind="primary" full onClick={onDone} className="mt-6">
          {t('f3_home')}
        </WBButton>
      </div>
    )
  }

  // ===== B1 Check-in =====
  if (screen === 'checkin') {
    return (
      <div className="min-h-app bg-paper flex flex-col px-6 pt-safe pb-safe">
        {/* Top bar with brand + variant chooser + close */}
        <div className="flex items-center justify-between py-3">
          <button type="button" onClick={onDone} className="text-caption text-ink-400 no-tap-highlight">
            {t('c2_cancel')}
          </button>
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

        <h1 className="text-h2 font-semibold text-ink-900 mt-2">{t('b1_title')}</h1>
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

  // ===== B3 Follow-up =====
  if (screen === 'followup') {
    return (
      <div className="min-h-app bg-paper flex flex-col px-6 pt-safe pb-safe">
        <div className="py-3">
          <WBBrand size="sm" />
        </div>
        <h1 className="text-h2 font-semibold text-ink-900 mt-4">{t('b3_heading')}</h1>

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
    <div className="min-h-app bg-paper flex flex-col px-6 pt-safe pb-safe">
      <div className="py-3">
        <WBBrand size="sm" />
      </div>
      <h1 className="text-h2 font-semibold text-ink-900 mt-4">{t('b4_heading')}</h1>

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
