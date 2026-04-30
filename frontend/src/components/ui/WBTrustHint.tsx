/**
 * WBTrustHint — Small privacy/trust indicator chip.
 *
 * Displayed on the home screen to reinforce trust. Shows a shield icon
 * with a short privacy message.
 */

interface Props {
  text: string
}

export default function WBTrustHint({ text }: Props) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent-50 border border-accent-100 px-3 py-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-accent-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span className="text-micro text-accent-700 leading-tight">{text}</span>
    </div>
  )
}
