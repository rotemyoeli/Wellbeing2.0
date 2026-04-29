/**
 * Pulse logo — brushwork "מ" mark with gradient.
 * From atoms-pulse.jsx.
 */
export default function WBPulseLogo({ size = 28 }: { size?: number }) {
  const id = 'pulse-grad'
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 28 35" fill="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="28" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--wb-accent-700)" />
          <stop offset="1" stopColor="var(--wb-teal-500)" />
        </linearGradient>
      </defs>
      <path
        d="M4 30 C4 14, 10 6, 14 6 C18 6, 20 14, 20 22 C20 14, 22 6, 26 6"
        stroke={`url(#${id})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="20" cy="32" r="2.2" fill="var(--wb-teal-500)" opacity="0.6" />
    </svg>
  )
}
