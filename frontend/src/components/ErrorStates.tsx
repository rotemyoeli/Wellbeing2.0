/**
 * F1 (network error), F2 (auth expired), F3 (404), offline banner.
 *
 * Phase 6A: all error states fully localized in Hebrew. No raw English
 * error messages like Safari's "Load failed" are shown to users.
 */
import WBButton from './ui/WBButton'
import { t } from '../lib/i18n'

interface StateShellProps {
  icon: React.ReactNode
  headline: string
  sub?: string
  primaryAction?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

function StateShell({ icon, headline, sub, primaryAction, secondaryAction }: StateShellProps) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-6 pb-safe"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 24px), 24px)' }}
    >
      <div className="w-16 h-16 rounded-xl border border-line bg-surface flex items-center justify-center mb-6 shadow-sm">
        {icon}
      </div>
      <h1 className="text-h3 font-semibold text-ink-900 text-center max-w-[320px]">{headline}</h1>
      {sub && <p className="text-body text-ink-500 text-center mt-3 max-w-[320px] leading-relaxed">{sub}</p>}
      <div className="flex gap-3 mt-8">
        {primaryAction && <WBButton kind="primary" onClick={primaryAction.onClick}>{primaryAction.label}</WBButton>}
        {secondaryAction && <WBButton kind="secondary" onClick={secondaryAction.onClick}>{secondaryAction.label}</WBButton>}
      </div>
    </div>
  )
}

export function NetworkError({ onRetry, onHome }: { onRetry: () => void; onHome?: () => void }) {
  return (
    <StateShell
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="1.5" strokeLinecap="round">
          <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
      }
      headline={t('f1_netErrTitle')}
      sub={t('f1_netErrBody')}
      primaryAction={{ label: t('f1_retry'), onClick: onRetry }}
      secondaryAction={onHome ? { label: t('f3_home'), onClick: onHome } : undefined}
    />
  )
}

export function AuthExpired({ onSignIn }: { onSignIn: () => void }) {
  return (
    <StateShell
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      }
      headline={t('f2_authExpired')}
      sub={t('f2_authExpiredSub')}
      primaryAction={{ label: t('f2_signInAgain'), onClick: onSignIn }}
    />
  )
}

export function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <StateShell
      icon={<span className="font-mono text-h2 font-bold text-ink-400">404</span>}
      headline={t('f3_notFound')}
      sub={t('f3_notFoundSub')}
      primaryAction={{ label: t('f3_home'), onClick: onHome }}
    />
  )
}

export function OfflineBanner() {
  return (
    <div
      className="fixed bottom-0 inset-x-0 bg-status-open-bg text-status-open-fg px-4 py-3 text-caption text-center z-50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
    >
      {t('offline')}
    </div>
  )
}
