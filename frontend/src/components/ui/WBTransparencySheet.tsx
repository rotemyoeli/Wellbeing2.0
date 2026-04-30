/**
 * WBTransparencySheet — "What the manager sees" overlay.
 *
 * Shows employees exactly what data managers can access, building trust
 * through proof rather than promises.
 */
import WBButton from './WBButton'
import { t } from '../../lib/i18n'

interface Props {
  open: boolean
  onClose: () => void
}

export default function WBTransparencySheet({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-paper rounded-t-2xl shadow-lg animate-slideUp pb-safe" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-700 to-teal-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-h3 font-bold text-ink-900">{t('transparency_title')}</h2>
              <p className="text-micro text-ink-400">{t('transparency_sub')}</p>
            </div>
          </div>

          {/* What manager SEES */}
          <div className="rounded-xl bg-teal-100/30 border border-teal-300 p-4 mb-3">
            <p className="text-micro font-semibold text-teal-700 uppercase tracking-widest mb-2">
              {t('transparency_sees')}
            </p>
            {['transparency_sees1', 'transparency_sees2', 'transparency_sees3', 'transparency_sees4'].map(k => (
              <div key={k} className="flex items-center gap-2 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                <span className="text-caption text-ink-700">{t(k)}</span>
              </div>
            ))}
          </div>

          {/* What manager does NOT see */}
          <div className="rounded-xl bg-alert-low-bg/30 border border-alert-low-border p-4 mb-4">
            <p className="text-micro font-semibold text-alert-low-fg uppercase tracking-widest mb-2">
              {t('transparency_notSees')}
            </p>
            {['transparency_notSees1', 'transparency_notSees2', 'transparency_notSees3', 'transparency_notSees4'].map(k => (
              <div key={k} className="flex items-center gap-2 py-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--wb-alert-low-fg)" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span className="text-caption text-ink-700">{t(k)}</span>
              </div>
            ))}
          </div>

          <WBButton kind="primary" full onClick={onClose}>{t('transparency_close')}</WBButton>
        </div>
      </div>
    </div>
  )
}
