/**
 * Orb energy meter — Pulse v5 variant B (from checkin-pulse.jsx).
 * Scalable orb with horizontal slider below. Gradient: lavender→plum→teal.
 */
import { useCallback, useRef } from 'react'
import { t } from '../lib/i18n'

interface Props {
  value: number
  onChange?: (v: number) => void
  size?: number
}

function orbColor(v: number): string {
  if (v < 30) return '#9676CC'
  if (v < 70) return '#7752BC'
  return '#3DB6A8'
}

function feelingIndex(v: number): number {
  if (v <= 20) return 0
  if (v <= 40) return 1
  if (v <= 60) return 2
  if (v <= 80) return 3
  return 4
}

export default function OrbMeter({ value, onChange, size = 240 }: Props) {
  const sliderRef = useRef<HTMLDivElement>(null)
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  const orbSize = 120 + (value / 100) * 110 // 120→230px
  const color = orbColor(value)
  const feeling = t(`feeling_${feelingIndex(value)}` as string) || ''

  const handleSlider = useCallback((e: React.PointerEvent) => {
    if (!sliderRef.current || !onChange) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    onChange(clamp((x / rect.width) * 100))
  }, [onChange])

  return (
    <div className="flex flex-col items-center gap-4" style={{ width: size }}>
      {/* Orb */}
      <div
        className="rounded-full flex items-center justify-center"
        style={{
          width: orbSize, height: orbSize,
          background: `radial-gradient(circle at 40% 35%, ${color}88, ${color})`,
          boxShadow: `inset 0 -8px 24px rgba(0,0,0,0.15), 0 8px 24px ${color}40`,
          transition: 'width 120ms ease-out, height 120ms ease-out, background 200ms ease',
        }}
      >
        <div className="flex flex-col items-center">
          <span className="text-white select-none" style={{ fontSize: 56, fontWeight: 700, fontFamily: 'Heebo, sans-serif', lineHeight: 1 }}>
            {value}
          </span>
          {feeling && (
            <span className="text-white/70 select-none mt-1" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {feeling}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal slider */}
      <div
        ref={sliderRef}
        className="relative w-full rounded-pill cursor-pointer no-tap-highlight"
        style={{
          height: 40,
          background: `linear-gradient(90deg, #9676CC, #7752BC 50%, #3DB6A8)`,
          touchAction: 'none',
        }}
        onPointerDown={(e) => { (e.target as Element).setPointerCapture(e.pointerId); handleSlider(e) }}
        onPointerMove={(e) => { if (e.buttons > 0) handleSlider(e) }}
        role="slider"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}
        aria-label="Energy level"
        tabIndex={0}
        onKeyDown={(e) => {
          if (!onChange) return
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)) }
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)) }
        }}
      >
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md flex items-center justify-center"
          style={{
            width: 36, height: 36,
            left: `calc(${value}% - 18px)`,
            transition: 'left 60ms ease-out',
          }}
        >
          <span className="text-caption font-bold text-ink-900">{value}</span>
        </div>
      </div>
    </div>
  )
}
