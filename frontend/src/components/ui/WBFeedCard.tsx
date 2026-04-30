/**
 * WBFeedCard — Team update card for the updates feed.
 *
 * Displays a manager's team update with avatar, name, date, and content.
 * Two variants: emphasized (latest) and muted (past).
 */
import { t } from '../../lib/i18n'
import type { TeamUpdate } from '../../types'

interface Props {
  update: TeamUpdate
  emphasized?: boolean
}

export default function WBFeedCard({ update, emphasized = false }: Props) {
  return (
    <div
      className={`
        rounded-xl border p-4
        ${emphasized
          ? 'border-accent-300 border-[1.5px] bg-accent-50 shadow-sm'
          : 'border-line bg-sunken'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-micro font-semibold text-teal-700 shrink-0">
          M
        </div>
        <span className="text-caption font-medium text-ink-700">{t('role_manager')}</span>
        <span className="text-micro text-ink-400 ms-auto">
          {update.published_at ? new Date(update.published_at).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="text-[14px] text-ink-700 leading-relaxed">{update.content}</p>
    </div>
  )
}
