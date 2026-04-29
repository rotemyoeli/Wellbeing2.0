import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  count?: number
  action?: ReactNode
}

export default function WBSectionLabel({ children, count, action }: Props) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-micro font-semibold uppercase tracking-widest text-ink-500">
        {children}
        {count !== undefined && (
          <span className="text-ink-400 ms-1">({count})</span>
        )}
      </span>
      {action}
    </div>
  )
}
