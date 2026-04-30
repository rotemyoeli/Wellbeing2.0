/**
 * WBReactionBar — Anonymous feedback buttons for team updates.
 *
 * Two small buttons: "Felt the change" / "Not yet".
 * Calls react API anonymously. Shows aggregate counts after voting.
 */
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { t } from '../../lib/i18n'

interface Props {
  updateId: string
}

export default function WBReactionBar({ updateId }: Props) {
  const [myVote, setMyVote] = useState<boolean | null>(null)
  const [counts, setCounts] = useState<{ felt_it: number; not_yet: number } | null>(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    api.getUpdateReactions(updateId)
      .then(r => setCounts({ felt_it: r.felt_it, not_yet: r.not_yet }))
      .catch(() => {})
  }, [updateId])

  const vote = async (feltIt: boolean) => {
    if (sending) return
    setSending(true)
    try {
      await api.reactToUpdate(updateId, feltIt)
      setMyVote(feltIt)
      // Refresh counts
      const r = await api.getUpdateReactions(updateId)
      setCounts({ felt_it: r.felt_it, not_yet: r.not_yet })
    } catch {}
    finally { setSending(false) }
  }

  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line/50">
      <button
        type="button"
        onClick={() => vote(true)}
        disabled={sending}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-pill text-micro font-medium transition no-tap-highlight
          ${myVote === true
            ? 'bg-teal-100 text-teal-700 border border-teal-300'
            : 'bg-sunken text-ink-500 border border-transparent hover:border-line'
          }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span>{t('reaction_feltIt')}</span>
        {counts && counts.felt_it > 0 && <span className="text-ink-400 ms-0.5">{counts.felt_it}</span>}
      </button>
      <button
        type="button"
        onClick={() => vote(false)}
        disabled={sending}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-pill text-micro font-medium transition no-tap-highlight
          ${myVote === false
            ? 'bg-accent-50 text-accent-700 border border-accent-300'
            : 'bg-sunken text-ink-500 border border-transparent hover:border-line'
          }`}
      >
        <span>{t('reaction_notYet')}</span>
        {counts && counts.not_yet > 0 && <span className="text-ink-400 ms-0.5">{counts.not_yet}</span>}
      </button>
    </div>
  )
}
