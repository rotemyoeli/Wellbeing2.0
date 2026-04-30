/**
 * A3 — Amendment 13 consent screen.
 * Shown once after first login. Required before any app usage.
 *
 * Phase 5A Fix #6: requires 3 explicit checkboxes before "I agree"
 * is enabled. Each checkbox maps to a key product trust statement.
 */
import { useState } from 'react'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

interface Props {
  onAccept: () => void
}

const sections = [
  { title: 'a3_what', body: 'a3_whatBody' },
  { title: 'a3_use', body: 'a3_useBody' },
  { title: 'a3_notUse', body: 'a3_notUseBody' },
  { title: 'a3_anon', body: 'a3_anonBody' },
  { title: 'a3_erasure', body: 'a3_erasureBody' },
] as const

const checkboxKeys = ['a3_check1', 'a3_check2', 'a3_check3'] as const

export default function ConsentPage({ onAccept }: Props) {
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [error, setError] = useState('')
  const [checks, setChecks] = useState([false, false, false])

  const allChecked = checks.every(Boolean)

  const toggleCheck = (i: number) => {
    setChecks(prev => prev.map((v, j) => j === i ? !v : v))
  }

  const handleAccept = async () => {
    setLoading(true)
    setError('')
    try {
      await api.acceptConsent()
      onAccept()
    } catch (err) {
      setError(t('a1_errNet'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 bg-paper z-10 px-6 pt-8 pb-4 border-b border-line">
        <WBBrand size="md" />
        <h1 className="text-h1 font-bold text-ink-900 mt-4">{t('a3_title')}</h1>
        <p className="text-body text-ink-500 mt-2">{t('a3_intro')}</p>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {sections.map((s, i) => (
          <div key={s.title} className={`${i > 0 ? 'mt-6 pt-6 border-t border-line' : ''}`}>
            <h2 className="text-micro font-semibold uppercase tracking-widest text-ink-500 mb-2">
              {t(s.title)}
            </h2>
            <p className="text-[14px] text-ink-700 leading-relaxed">
              {t(s.body)}
            </p>
          </div>
        ))}

        {/* Required checkboxes */}
        <div className="mt-8 pt-6 border-t border-line flex flex-col gap-4">
          {checkboxKeys.map((key, i) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => toggleCheck(i)}
                className="mt-1 w-4 h-4 accent-accent-700 shrink-0"
              />
              <span className="text-[14px] text-ink-700 leading-relaxed">{t(key)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-paper px-6 py-4 border-t border-line">
        {declined && (
          <p className="text-caption text-alert-low-fg mb-3">{t('a3_declined')}</p>
        )}
        {error && (
          <p className="text-caption text-alert-low-fg mb-3">{error}</p>
        )}
        <WBButton kind="primary" full onClick={handleAccept} disabled={loading || !allChecked}>
          {t('a3_agree')}
        </WBButton>
        {!allChecked && (
          <p className="text-micro text-ink-400 text-center mt-2">
            {t('a3_intro')}
          </p>
        )}
        <button
          type="button"
          onClick={() => setDeclined(true)}
          className="w-full text-center text-caption text-ink-500 mt-3"
        >
          {t('a3_decline')}
        </button>
      </div>
    </div>
  )
}
