type Status = 'open' | 'seen' | 'ack1' | 'contacted' | 'ack2' | 'closed'

const statusMap: Record<string, { bg: string; fg: string }> = {
  open: { bg: 'bg-status-open-bg', fg: 'text-status-open-fg' },
  ack1: { bg: 'bg-status-seen-bg', fg: 'text-status-seen-fg' },
  seen: { bg: 'bg-status-seen-bg', fg: 'text-status-seen-fg' },
  ack2: { bg: 'bg-status-contacted-bg', fg: 'text-status-contacted-fg' },
  contacted: { bg: 'bg-status-contacted-bg', fg: 'text-status-contacted-fg' },
  closed: { bg: 'bg-status-closed-bg', fg: 'text-status-closed-fg' },
}

export default function WBStatusPill({ status, label }: { status: Status; label: string }) {
  const s = statusMap[status] || statusMap.open
  return (
    <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-micro font-semibold ${s.bg} ${s.fg}`}>
      {label}
    </span>
  )
}
