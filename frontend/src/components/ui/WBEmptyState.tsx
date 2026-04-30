/**
 * WBEmptyState — Helpful empty states that educate and guide.
 *
 * Used when a section has no data. Shows a calm icon, a headline,
 * a helpful explanation, and an optional action.
 */
import type { ReactNode } from 'react'
import WBButton from './WBButton'

interface Props {
  icon?: ReactNode
  headline: string
  body?: string
  action?: { label: string; onClick: () => void }
}

const defaultIcon = (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-300)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
)

export default function WBEmptyState({ icon, headline, body, action }: Props) {
  return (
    <div className="flex flex-col items-center py-10 px-6">
      <div className="w-14 h-14 rounded-xl bg-sunken flex items-center justify-center mb-4">
        {icon || defaultIcon}
      </div>
      <p className="text-body font-medium text-ink-500 text-center">{headline}</p>
      {body && <p className="text-caption text-ink-400 text-center mt-2 max-w-[280px] leading-relaxed">{body}</p>}
      {action && (
        <WBButton kind="secondary" className="mt-4" onClick={action.onClick}>
          {action.label}
        </WBButton>
      )}
    </div>
  )
}
