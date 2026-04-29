/**
 * Signature wavy line — from atoms-pulse.jsx.
 */
export default function WBPulseLine({ w = 80 }: { w?: number }) {
  return (
    <svg width={w} height={6} viewBox="0 0 80 6" fill="none">
      <path
        d="M1 3 Q 12 0, 24 3 T 48 3 T 72 3 T 79 3"
        stroke="var(--wb-teal-500)"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
