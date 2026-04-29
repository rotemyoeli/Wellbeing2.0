import { useCallback, useRef } from 'react'

interface Props {
  value: number
  onChange?: (v: number) => void
  width?: number
  height?: number
}

export default function BatteryMeter({ value, onChange, width = 170, height = 310 }: Props) {
  const bodyRef = useRef<SVGRectElement>(null)

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  const handlePointer = useCallback((e: React.PointerEvent) => {
    if (!bodyRef.current || !onChange) return
    const rect = bodyRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const pct = clamp(100 - (y / rect.height) * 100)
    onChange(pct)
  }, [onChange])

  const capW = width * 0.3
  const capH = 14
  const bodyY = capH + 4
  const bodyH = height - bodyY
  const fillH = (value / 100) * (bodyH - 8)
  const r = 14

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label="Energy level"
      tabIndex={0}
      className="cursor-pointer no-tap-highlight select-none"
      onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); handlePointer(e) }}
      onPointerMove={(e) => { if (e.buttons > 0) handlePointer(e) }}
      onKeyDown={(e) => {
        if (!onChange) return
        if (e.key === 'ArrowUp') onChange(clamp(value + 1))
        else if (e.key === 'ArrowDown') onChange(clamp(value - 1))
        else if (e.key === 'PageUp') onChange(clamp(value + 10))
        else if (e.key === 'PageDown') onChange(clamp(value - 10))
        else if (e.key === 'Home') onChange(0)
        else if (e.key === 'End') onChange(100)
      }}
    >
      {/* Cap */}
      <rect
        x={(width - capW) / 2} y={0}
        width={capW} height={capH}
        rx={4} fill="var(--wb-line-bold)"
      />
      {/* Body outline */}
      <rect
        ref={bodyRef}
        x={4} y={bodyY}
        width={width - 8} height={bodyH}
        rx={r} fill="var(--wb-sunken)"
        stroke="var(--wb-line-bold)" strokeWidth={2}
      />
      {/* Fill */}
      <rect
        x={8} y={bodyY + bodyH - 4 - fillH}
        width={width - 16} height={fillH}
        rx={r - 4} fill="var(--wb-accent-700)"
      />
      {/* Value text */}
      <text
        x={width / 2} y={bodyY + bodyH / 2 - 8}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink-900 select-none pointer-events-none"
        style={{ fontSize: 72, fontWeight: 700, fontFamily: 'Heebo, sans-serif' }}
      >
        {value}
      </text>
      <text
        x={width / 2} y={bodyY + bodyH / 2 + 34}
        textAnchor="middle"
        className="fill-ink-500 select-none pointer-events-none"
        style={{ fontSize: 14, fontWeight: 500 }}
      >
        %
      </text>
    </svg>
  )
}
