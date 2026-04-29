/**
 * Battery energy meter — the core check-in widget.
 *
 * Phase 5B: improved for one-hand mobile use:
 * - Larger touch target (280x280 per spec)
 * - Touch/pointer capture for smooth drag
 * - Keyboard accessible (arrows, page up/down, home/end)
 * - Value text centered in battery body
 * - Calm accent fill, no alarming colors
 */
import { useCallback, useRef } from 'react'

interface Props {
  value: number
  onChange?: (v: number) => void
  width?: number
  height?: number
}

export default function BatteryMeter({ value, onChange, width = 180, height = 320 }: Props) {
  const bodyRef = useRef<SVGRectElement>(null)

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  const handlePointer = useCallback((e: React.PointerEvent) => {
    if (!bodyRef.current || !onChange) return
    const rect = bodyRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const pct = clamp(100 - (y / rect.height) * 100)
    onChange(pct)
  }, [onChange])

  const capW = width * 0.28
  const capH = 12
  const bodyY = capH + 4
  const bodyH = height - bodyY
  const r = 16
  const inset = 6
  const fillH = (value / 100) * (bodyH - inset * 2)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`Energy: ${value} of 100`}
      aria-label="Energy level"
      tabIndex={0}
      className="cursor-pointer no-tap-highlight select-none outline-none focus-visible:drop-shadow-[0_0_6px_var(--wb-accent-500)]"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture(e.pointerId)
        handlePointer(e)
      }}
      onPointerMove={(e) => { if (e.buttons > 0) handlePointer(e) }}
      onKeyDown={(e) => {
        if (!onChange) return
        const step = e.shiftKey ? 10 : 1
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(value + step)) }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(value - step)) }
        else if (e.key === 'PageUp') { e.preventDefault(); onChange(clamp(value + 10)) }
        else if (e.key === 'PageDown') { e.preventDefault(); onChange(clamp(value - 10)) }
        else if (e.key === 'Home') { e.preventDefault(); onChange(0) }
        else if (e.key === 'End') { e.preventDefault(); onChange(100) }
      }}
    >
      {/* Cap */}
      <rect
        x={(width - capW) / 2} y={0}
        width={capW} height={capH}
        rx={4} fill="var(--wb-line-bold)"
      />
      {/* Body */}
      <rect
        ref={bodyRef}
        x={2} y={bodyY}
        width={width - 4} height={bodyH}
        rx={r} fill="var(--wb-sunken)"
        stroke="var(--wb-line-bold)" strokeWidth={1.5}
      />
      {/* Fill */}
      {fillH > 0 && (
        <rect
          x={2 + inset} y={bodyY + bodyH - inset - fillH}
          width={width - 4 - inset * 2} height={fillH}
          rx={r - inset + 2} fill="var(--wb-accent-700)"
          style={{ transition: 'height 50ms ease-out, y 50ms ease-out' }}
        />
      )}
      {/* Value */}
      <text
        x={width / 2} y={bodyY + bodyH / 2 - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none pointer-events-none"
        fill="var(--wb-ink-900)"
        style={{ fontSize: 64, fontWeight: 700, fontFamily: 'Heebo, sans-serif' }}
      >
        {value}
      </text>
      <text
        x={width / 2} y={bodyY + bodyH / 2 + 30}
        textAnchor="middle"
        className="select-none pointer-events-none"
        fill="var(--wb-ink-400)"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        %
      </text>
    </svg>
  )
}
