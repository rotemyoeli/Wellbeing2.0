/**
 * Battery energy meter — Pulse v5 variant A (from checkin-pulse.jsx).
 * Gradient fill: lavender (low) → plum (mid) → teal (high).
 * Feeling labels mapped from i18n strings.
 */
import { useCallback, useRef } from 'react'
import { t } from '../lib/i18n'

interface Props {
  value: number
  onChange?: (v: number) => void
  width?: number
  height?: number
}

function fillColor(v: number): string {
  if (v < 30) return '#9676CC' // lavender
  if (v < 70) return '#7752BC' // plum
  return '#3DB6A8' // teal
}

function feelingIndex(v: number): number {
  if (v <= 20) return 0
  if (v <= 40) return 1
  if (v <= 60) return 2
  if (v <= 80) return 3
  return 4
}

export default function BatteryMeter({ value, onChange, width = 170, height = 300 }: Props) {
  const bodyRef = useRef<SVGRectElement>(null)
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  const handlePointer = useCallback((e: React.PointerEvent) => {
    if (!bodyRef.current || !onChange) return
    const rect = bodyRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    onChange(clamp(100 - (y / rect.height) * 100))
  }, [onChange])

  const capW = width * 0.28
  const capH = 12
  const bodyY = capH + 4
  const bodyH = height - bodyY
  const r = 16
  const inset = 6
  const fillH = (value / 100) * (bodyH - inset * 2)
  const color = fillColor(value)
  const feeling = t(`feeling_${feelingIndex(value)}` as string) || ''

  return (
    <svg
      width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="slider"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
      aria-valuetext={`Energy: ${value} of 100`}
      aria-label="Energy level"
      tabIndex={0}
      className="cursor-pointer no-tap-highlight select-none outline-none focus-visible:drop-shadow-[0_0_6px_var(--wb-accent-500)]"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); handlePointer(e) }}
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
      <rect x={(width - capW) / 2} y={0} width={capW} height={capH} rx={4} fill="var(--wb-line-bold)" />
      {/* Body */}
      <rect ref={bodyRef} x={2} y={bodyY} width={width - 4} height={bodyH} rx={r} fill="var(--wb-sunken)" stroke="var(--wb-line-bold)" strokeWidth={1.5} />
      {/* Fill with gradient color */}
      {fillH > 0 && (
        <rect
          x={2 + inset} y={bodyY + bodyH - inset - fillH}
          width={width - 4 - inset * 2} height={fillH}
          rx={r - inset + 2} fill={color}
          style={{ transition: 'height 80ms ease-out, y 80ms ease-out, fill 200ms ease' }}
        />
      )}
      {/* Shine overlay */}
      {fillH > 20 && (
        <rect
          x={2 + inset + 4} y={bodyY + bodyH - inset - fillH + 4}
          width={12} height={fillH - 8}
          rx={6} fill="white" opacity={0.12}
        />
      )}
      {/* Value */}
      <text
        x={width / 2} y={bodyY + bodyH / 2 - 10}
        textAnchor="middle" dominantBaseline="central"
        fill="var(--wb-ink-900)"
        style={{ fontSize: 60, fontWeight: 700, fontFamily: 'Heebo, sans-serif' }}
        className="select-none pointer-events-none"
      >{value}</text>
      <text
        x={width / 2} y={bodyY + bodyH / 2 + 22}
        textAnchor="middle"
        fill="var(--wb-ink-400)"
        style={{ fontSize: 13, fontWeight: 500 }}
        className="select-none pointer-events-none"
      >%</text>
      {/* Feeling label below battery */}
      {feeling && (
        <text
          x={width / 2} y={height - 2}
          textAnchor="middle"
          fill={color}
          style={{ fontSize: 13, fontWeight: 600 }}
          className="select-none pointer-events-none"
        >{feeling}</text>
      )}
    </svg>
  )
}
