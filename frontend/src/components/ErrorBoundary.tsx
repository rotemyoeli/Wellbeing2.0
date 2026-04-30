/**
 * Global error boundary — catches React render crashes.
 * Shows a polished Hebrew error screen instead of a blank page.
 */
import { Component, type ReactNode } from 'react'
import WBButton from './ui/WBButton'
import { t } from '../lib/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-app bg-paper flex flex-col items-center justify-center px-6 pb-safe pt-safe">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-100 to-surface flex items-center justify-center mb-6 shadow-md border border-accent-300">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-h3 font-semibold text-ink-900 text-center">{t('f1_netErrTitle')}</h1>
          <p className="text-body text-ink-500 text-center mt-3 max-w-[320px] leading-relaxed">
            {t('f1_netErrBody')}
          </p>
          <WBButton kind="primary" className="mt-8" onClick={() => window.location.reload()}>
            {t('f1_retry')}
          </WBButton>
        </div>
      )
    }

    return this.props.children
  }
}
