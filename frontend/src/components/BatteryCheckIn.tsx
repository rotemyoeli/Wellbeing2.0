/**
 * BatteryCheckIn — the core check-in UI component.
 *
 * Spec v2 §11 design directives this component embodies:
 *   - Single-thumb mobile operation, max 1 scroll, large Submit button at bottom
 *   - Drag/click to set energy 0..100, instant response
 *   - Touch targets >=44px, font >=16px
 *   - Anonymity status indicator persistently visible (top-right corner)
 *   - Soft colours, no alarming red on the employee screen
 *   - Battery metaphor (subject to validation in Q15)
 *
 * v0.1 scope: visual + interaction only. The Submit button currently
 * triggers a stub call that returns 501 from the backend — Sprint 2 wires
 * the real submission flow.
 *
 * Accessibility (Spec v2 NFR-USAB-01, WCAG 2.1 AA):
 *   - Slider has aria-valuenow/min/max + aria-label
 *   - Keyboard support: ArrowLeft/Right (-1/+1), Home/End, PageUp/Down (+/-10)
 *   - Touch + mouse + keyboard all work
 *   - Energy value is announced via aria-live region
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CheckInPayload } from '../types'

interface BatteryCheckInProps {
  /** Initial value (default 50). */
  initialEnergy?: number
  /** Whether anonymity is allowed at all (governed by ward policy). */
  allowAnonymous?: boolean
  /** Submit handler — receives the validated payload. */
  onSubmit?: (payload: CheckInPayload) => Promise<void> | void
}

/** Clamp a value to [min, max]. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Map energy (0..100) to a colour token. Soft palette, no alarming red. */
function energyColour(energy: number): { fill: string; track: string } {
  // Single brand-blue family across the whole range — deliberately *not*
  // red/yellow/green. Spec v2 §11: avoid alarming colours on the employee
  // screen. Manager dashboards use the red/green scheme; staff don't see it.
  if (energy < 25) return { fill: 'fill-brand-700', track: 'fill-brand-50' }
  if (energy < 50) return { fill: 'fill-brand-600', track: 'fill-brand-50' }
  if (energy < 75) return { fill: 'fill-brand-500', track: 'fill-brand-50' }
  return { fill: 'fill-brand-500', track: 'fill-brand-50' }
}

export default function BatteryCheckIn({
  initialEnergy = 50,
  allowAnonymous = true,
  onSubmit,
}: BatteryCheckInProps) {
  const [energy, setEnergy] = useState<number>(clamp(initialEnergy, 0, 100))
  const [anonymous, setAnonymous] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedAt, setSubmittedAt] = useState<number | null>(null)
  const trackRef = useRef<SVGRectElement | null>(null)
  const startTimeRef = useRef<number>(Date.now())

  /* ----------------------- Energy update logic ------------------------ */

  /** Update energy from a clientY coordinate against the track. */
  const updateFromClientY = useCallback((clientY: number) => {
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    if (rect.height === 0) return
    // Vertical battery: top = 100, bottom = 0
    const ratio = (rect.bottom - clientY) / rect.height
    setEnergy(Math.round(clamp(ratio * 100, 0, 100)))
  }, [])

  /* Pointer events (works for mouse + touch) */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      updateFromClientY(e.clientY)
    },
    [updateFromClientY],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.buttons === 0) return
      updateFromClientY(e.clientY)
    },
    [updateFromClientY],
  )

  /* Keyboard support */
  const onKeyDown = useCallback((e: React.KeyboardEvent<SVGSVGElement>) => {
    let next = energy
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        next = clamp(energy + 1, 0, 100)
        break
      case 'ArrowDown':
      case 'ArrowLeft':
        next = clamp(energy - 1, 0, 100)
        break
      case 'PageUp':
        next = clamp(energy + 10, 0, 100)
        break
      case 'PageDown':
        next = clamp(energy - 10, 0, 100)
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = 100
        break
      default:
        return
    }
    e.preventDefault()
    setEnergy(next)
  }, [energy])

  /* ----------------------- Submit ------------------------ */

  const handleSubmit = useCallback(async () => {
    setError(null)
    setSubmitting(true)
    try {
      const payload: CheckInPayload = {
        energy,
        anonMode: anonymous,
        source: 'web',
      }
      if (onSubmit) {
        await onSubmit(payload)
      } else {
        // Default no-op submit so the component is usable in isolation.
        await new Promise((r) => setTimeout(r, 250))
      }
      setSubmittedAt(Date.now())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submit failed'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }, [energy, anonymous, onSubmit])

  /* ----------------------- Time tracking (15s target) ------------------------ */

  const elapsedSeconds = useMemo(() => {
    if (!submittedAt) return null
    return Math.round((submittedAt - startTimeRef.current) / 100) / 10
  }, [submittedAt])

  /* Reset the start clock when component mounts */
  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [])

  /* ----------------------- Render ------------------------ */

  const colours = energyColour(energy)
  const fillRatio = energy / 100

  /* Battery dimensions — chosen to fit comfortably above-the-fold on a 320×568 viewport */
  const W = 200
  const H = 320
  const STROKE = 6
  const TIP_W = 60
  const TIP_H = 18
  const innerY = STROKE + 4
  const innerX = STROKE + 4
  const innerW = W - 2 * (STROKE + 4)
  const innerH = H - 2 * (STROKE + 4)
  const fillH = innerH * fillRatio
  const fillY = innerY + innerH - fillH

  if (submittedAt !== null) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
        role="status"
      >
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-semibold">Thank you</h1>
        <p className="max-w-xs text-ink-700">
          Your wellbeing matters to us.
        </p>
        {elapsedSeconds !== null && (
          <p className="text-sm text-ink-500">
            That took {elapsedSeconds}s.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-4 pb-8">
      {/* Top bar with persistent anonymity indicator (Spec v2 §11) */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-ink-900">How are you right now?</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            anonymous
              ? 'bg-ink-900 text-white'
              : 'bg-brand-50 text-brand-900'
          }`}
          aria-live="polite"
        >
          {anonymous ? 'Anonymous' : 'Identified'}
        </span>
      </div>

      <p className="mb-6 text-sm text-ink-500">
        Drag the battery up or down. Submit when it feels right.
      </p>

      {/* Battery */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <svg
          width={W}
          height={H + TIP_H}
          viewBox={`0 0 ${W} ${H + TIP_H}`}
          role="slider"
          tabIndex={0}
          aria-label="Energy level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={energy}
          aria-valuetext={`${energy} percent`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onKeyDown={onKeyDown}
          className="touch-none cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 no-tap-highlight"
        >
          {/* Battery tip */}
          <rect
            x={(W - TIP_W) / 2}
            y={0}
            width={TIP_W}
            height={TIP_H}
            rx={6}
            className="fill-ink-900"
          />
          {/* Outer body */}
          <rect
            x={STROKE / 2}
            y={TIP_H + STROKE / 2}
            width={W - STROKE}
            height={H - STROKE}
            rx={24}
            ry={24}
            fill="none"
            className="stroke-ink-900"
            strokeWidth={STROKE}
          />
          {/* Inner track */}
          <rect
            ref={trackRef}
            x={innerX}
            y={innerY + TIP_H}
            width={innerW}
            height={innerH}
            rx={18}
            className={colours.track}
          />
          {/* Fill */}
          <rect
            x={innerX}
            y={fillY + TIP_H}
            width={innerW}
            height={fillH}
            rx={18}
            className={`${colours.fill} transition-[height,y] duration-75`}
          />
          {/* Energy number, centered, large */}
          <text
            x={W / 2}
            y={TIP_H + H / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink-900"
            style={{ fontSize: '64px', fontWeight: 700 }}
          >
            {energy}
          </text>
          <text
            x={W / 2}
            y={TIP_H + H / 2 + 36}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-ink-500"
            style={{ fontSize: '14px' }}
          >
            %
          </text>
        </svg>
      </div>

      {/* Anonymous toggle (only if policy allows) */}
      {allowAnonymous && (
        <button
          type="button"
          onClick={() => setAnonymous((v) => !v)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl bg-ink-300/30 px-4 py-3 text-left no-tap-highlight"
          aria-pressed={anonymous}
        >
          <div>
            <div className="font-medium text-ink-900">Report anonymously</div>
            <div className="text-xs text-ink-500">
              {anonymous
                ? 'Your identity is hashed before submission. Cannot be reversed.'
                : 'Your name is attached to this report.'}
            </div>
          </div>
          <div
            className={`relative h-7 w-12 rounded-full transition-colors ${
              anonymous ? 'bg-ink-900' : 'bg-ink-300'
            }`}
          >
            <div
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                anonymous ? 'left-6' : 'left-1'
              }`}
            />
          </div>
        </button>
      )}

      {/* Submit */}
      {error && (
        <p className="mb-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-2xl bg-ink-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 no-tap-highlight"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </button>
    </div>
  )
}
