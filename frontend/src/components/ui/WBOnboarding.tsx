/**
 * WBOnboarding — 3-step intro wizard for first-time users.
 * Shown once, stored in localStorage.
 */
import { useState } from 'react'
import WBButton from './WBButton'
import { t } from '../../lib/i18n'

interface Props {
  onComplete: () => void
}

const STEPS = [
  { title: 'onboarding_1_title', body: 'onboarding_1_body', icon: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )},
  { title: 'onboarding_2_title', body: 'onboarding_2_body', icon: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wb-teal-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="3" /><line x1="12" y1="14" x2="12" y2="18" />
    </svg>
  )},
  { title: 'onboarding_3_title', body: 'onboarding_3_body', icon: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )},
]

export default function WBOnboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1)
    else { localStorage.setItem('wellbeing.onboarded', 'true'); onComplete() }
  }

  const skip = () => { localStorage.setItem('wellbeing.onboarded', 'true'); onComplete() }

  const s = STEPS[step]

  return (
    <div className="min-h-app bg-paper flex flex-col items-center justify-center px-8">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-accent-700 w-6' : 'bg-ink-200'}`} />
        ))}
      </div>

      {/* Icon */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-50 to-surface border border-accent-100 flex items-center justify-center mb-6 shadow-sm">
        {s.icon}
      </div>

      {/* Content */}
      <h1 className="text-h2 font-bold text-ink-900 text-center">{t(s.title)}</h1>
      <p className="text-body text-ink-500 text-center mt-3 max-w-[300px] leading-relaxed">{t(s.body)}</p>

      <div className="flex-1" />

      {/* Actions */}
      <div className="w-full max-w-xs flex flex-col gap-2 mt-8 mb-8">
        <WBButton kind="primary" full onClick={next}>
          {step === STEPS.length - 1 ? t('onboarding_start') : t('onboarding_next')}
        </WBButton>
        {step < STEPS.length - 1 && (
          <button type="button" onClick={skip} className="text-caption text-ink-400 text-center py-2 no-tap-highlight">
            {t('onboarding_skip')}
          </button>
        )}
      </div>
    </div>
  )
}
