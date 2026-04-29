/**
 * A3 — Amendment 13 consent screen.
 * Shown once after first login. Required before any app usage.
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

export default function ConsentPage({ onAccept }: Props) {
  const [loading, setLoading] = useState(false)
  const [declined, setDeclined] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    try {
      await api.acceptConsent()
      onAccept()
    } catch {
      // Retry silently
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
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-paper px-6 py-4 border-t border-line">
        {declined && (
          <p className="text-caption text-alert-low-fg mb-3">{t('a3_declined')}</p>
        )}
        <WBButton kind="primary" full onClick={handleAccept} disabled={loading}>
          {t('a3_agree')}
        </WBButton>
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
