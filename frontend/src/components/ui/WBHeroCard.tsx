/**
 * WBHeroCard — Featured CTA card for the employee home screen.
 *
 * A prominent, inviting card that draws attention to the primary action.
 * Uses accent-700 background with white text.
 */
import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  action: ReactNode
  icon?: ReactNode
}

export default function WBHeroCard({ title, subtitle, action, icon }: Props) {
  return (
    <div className="rounded-xl bg-accent-700 border border-accent-700 p-5 shadow-md">
      <div className="flex items-start gap-4">
        {icon && (
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-white/95 font-semibold leading-snug">{title}</p>
          {subtitle && <p className="text-caption text-white/60 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{action}</div>
    </div>
  )
}
