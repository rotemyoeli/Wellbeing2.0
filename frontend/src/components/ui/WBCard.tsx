import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  sunken?: boolean
  className?: string
  padding?: number
}

export default function WBCard({ children, sunken = false, className = '', padding = 16 }: Props) {
  return (
    <div
      className={`
        rounded-lg border border-line
        ${sunken ? 'bg-sunken' : 'bg-surface'}
        ${className}
      `}
      style={{ padding }}
    >
      {children}
    </div>
  )
}
