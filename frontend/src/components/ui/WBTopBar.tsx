/**
 * WBTopBar — Compact mobile header bar.
 *
 * Sits at the top of each page with brand, optional title, and trailing actions.
 * Respects safe-area-inset-top.
 */
import type { ReactNode } from 'react'
import WBBrand from './WBBrand'

interface Props {
  title?: string
  trailing?: ReactNode
  onBack?: () => void
  backLabel?: string
  showBrand?: boolean
}

export default function WBTopBar({ title, trailing, onBack, backLabel, showBrand = true }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-line/50 pt-safe">
      <div className="flex items-center justify-between px-5 h-12">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-accent-700 text-caption font-medium shrink-0 no-tap-highlight"
            >
              {backLabel || '→'}
            </button>
          )}
          {showBrand && !title && <WBBrand size="sm" />}
          {title && (
            <h1 className="text-h3 font-semibold text-ink-900 truncate">{title}</h1>
          )}
        </div>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
    </header>
  )
}
