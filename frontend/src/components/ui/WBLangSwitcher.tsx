/**
 * WBLangSwitcher — compact language selector.
 *
 * Shows current language code (HE/EN/AR) as a small pill.
 * Tap to cycle through available languages.
 */
import { useState } from 'react'
import { getLang, setLang, type Lang } from '../../lib/i18n'

const LANGS: { code: Lang; label: string }[] = [
  { code: 'he', label: 'HE' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
]

export default function WBLangSwitcher() {
  const [current, setCurrent] = useState<Lang>(getLang())

  const cycle = () => {
    const idx = LANGS.findIndex(l => l.code === current)
    const next = LANGS[(idx + 1) % LANGS.length]
    setLang(next.code)
    setCurrent(next.code)
    // Force re-render by reloading — simplest way to update all t() calls
    window.location.reload()
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="h-8 px-2 rounded-lg bg-sunken flex items-center gap-1 no-tap-highlight transition hover:shadow-sm"
      aria-label="Switch language"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="text-micro font-semibold text-ink-500">{LANGS.find(l => l.code === current)?.label}</span>
    </button>
  )
}
