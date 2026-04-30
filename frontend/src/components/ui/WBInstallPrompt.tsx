/**
 * WBInstallPrompt — PWA "Add to Home Screen" prompt.
 *
 * Shows once per session (dismissible). Uses the beforeinstallprompt
 * browser event when available, otherwise shows a hint.
 */
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function WBInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('wellbeing.pwaPromptDismissed') === 'true'
  )
  const [isStandalone] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || isStandalone) return null
  if (!deferredPrompt) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
      localStorage.setItem('wellbeing.pwaPromptDismissed', 'true')
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('wellbeing.pwaPromptDismissed', 'true')
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-accent-300 bg-accent-50 px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-accent-700 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-caption font-medium text-ink-900">{t('pwa_install')}</p>
        <p className="text-micro text-ink-400">{t('pwa_installSub')}</p>
      </div>
      <button type="button" onClick={handleInstall}
        className="px-3 py-1.5 rounded-pill bg-accent-700 text-white text-micro font-medium shrink-0 no-tap-highlight">
        {t('pwa_install')}
      </button>
      <button type="button" onClick={handleDismiss} className="text-ink-400 text-caption shrink-0 px-1 no-tap-highlight">
        x
      </button>
    </div>
  )
}
