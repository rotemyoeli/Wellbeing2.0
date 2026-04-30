/**
 * WBPage — Standard page wrapper with safe-area padding and bottom nav clearance.
 *
 * Provides consistent min-height, padding, and background for all pages
 * within the mobile shell.
 */
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** If true, adds bottom padding to clear the bottom nav */
  hasBottomNav?: boolean
  /** If true, uses full viewport height for centered content */
  centered?: boolean
}

export default function WBPage({ children, className = '', hasBottomNav = true, centered = false }: Props) {
  return (
    <div
      className={`
        min-h-app bg-paper
        ${hasBottomNav ? 'pb-nav' : 'pb-safe'}
        ${centered ? 'flex flex-col items-center justify-center' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
