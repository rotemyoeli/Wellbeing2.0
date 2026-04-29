/**
 * Orb energy meter — organic blob variant (B1Alt3 from extra-screens.jsx).
 * Bio-inspired shape that morphs with energy value.
 */
import { useCallback, useMemo } from 'react'

interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
}

export default function OrbMeter({ value, onChange, size = 260 }: Props) {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  const points = useMemo(() => {
    const n = 16
    const cx = size / 2
    const cy = size / 2
    const baseR = size * 0.32
    const scale = 0.7 + (value / 100) * 0.3
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * Math.PI * 2
      const wobble = Math.sin(angle * 3 + value * 0.05) * 8 * scale
      const r = baseR * scale + wobble
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`
    }).join(' ')
  }, [value, size])

  const handlePointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!onChange) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const pct = clamp(100 - (y / rect.height) * 100)
    onChange(pct)
  }, [onChange])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`Energy: ${value} of 100`}
      aria-label="Energy level"
      tabIndex={0}
      className="cursor-pointer no-tap-highlight select-none outline-none"
      style={{ touchAction: 'none', filter: 'drop-shadow(0 4px 16px rgba(82,47,138,0.25))' }}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); handlePointer(e) }}
      onPointerMove={(e) => { if (e.buttons > 0) handlePointer(e) }}
      onKeyDown={(e) => {
        if (!onChange) return
        if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)) }
        else if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)) }
        else if (e.key === 'PageUp') { e.preventDefault(); onChange(clamp(value + 10)) }
        else if (e.key === 'PageDown') { e.preventDefault(); onChange(clamp(value - 10)) }
      }}
    >
      <defs>
        <radialGradient id="orb-grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--wb-accent-300)" />
          <stop offset="100%" stopColor="var(--wb-accent-700)" />
        </radialGradient>
      </defs>
      <polygon
        points={points}
        fill="url(#orb-grad)"
        style={{ transition: 'all 120ms ease-out' }}
      />
      <text
        x={size / 2} y={size / 2 - 4}
        textAnchor="middle" dominantBaseline="central"
        fill="white"
        style={{ fontSize: 64, fontWeight: 700, fontFamily: 'Heebo, sans-serif' }}
        className="select-none pointer-events-none"
      >
        {value}
      </text>
      <text
        x={size / 2} y={size / 2 + 32}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}
        className="select-none pointer-events-none"
      >
        energy
      </text>
    </svg>
  )
}
