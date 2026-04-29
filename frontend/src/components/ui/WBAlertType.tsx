type AlertKind = 'low' | 'high'

export default function WBAlertType({ type, label }: { type: AlertKind; label: string }) {
  const isLow = type === 'low'
  return (
    <span
      className={`
        inline-flex items-center rounded-sm px-2 py-0.5
        text-micro font-semibold uppercase
        ${isLow ? 'bg-alert-low-bg text-alert-low-fg' : 'bg-alert-high-bg text-alert-high-fg'}
      `}
    >
      {label}
    </span>
  )
}
