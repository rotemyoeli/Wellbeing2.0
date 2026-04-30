/**
 * WBNotifPrompt — Push notification permission request.
 * Shows once, dismissible. Uses the Notification API.
 */
import { useEffect, useState } from 'react'
import { t } from '../../lib/i18n'

export default function WBNotifPrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (localStorage.getItem('wellbeing.notifDismissed') === 'true') return
    setShow(true)
  }, [])

  if (!show) return null

  const handleEnable = async () => {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      new Notification('Wellbeing2.0', { body: t('notif_enabled') })
    }
    setShow(false)
    localStorage.setItem('wellbeing.notifDismissed', 'true')
  }

  const dismiss = () => {
    setShow(false)
    localStorage.setItem('wellbeing.notifDismissed', 'true')
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-teal-300 bg-teal-100/30 px-4 py-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-caption font-medium text-ink-900">{t('notif_enable')}</p>
        <p className="text-micro text-ink-400">{t('notif_enableSub')}</p>
      </div>
      <button type="button" onClick={handleEnable}
        className="px-3 py-1.5 rounded-pill bg-teal-500 text-white text-micro font-medium shrink-0 no-tap-highlight">
        {t('notif_enable')}
      </button>
      <button type="button" onClick={dismiss} className="text-ink-400 text-caption shrink-0 px-1 no-tap-highlight">x</button>
    </div>
  )
}
