/**
 * Smoke tests for BatteryCheckIn.
 *
 * These don't fully test drag interaction (jsdom + pointer events are flaky)
 * but they confirm:
 *   - The component renders
 *   - Initial energy value is shown
 *   - The anonymity indicator reflects the toggle
 *   - Keyboard arrows update the energy
 *   - Submit invokes the onSubmit callback with the right payload shape
 *   - Success state replaces the form after submit
 */

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import BatteryCheckIn from './BatteryCheckIn'

describe('BatteryCheckIn', () => {
  it('renders with the initial energy value', () => {
    render(<BatteryCheckIn initialEnergy={50} />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('shows "Identified" by default in the corner indicator', () => {
    render(<BatteryCheckIn />)
    expect(screen.getByText('Identified')).toBeInTheDocument()
  })

  it('toggles to "Anonymous" when the toggle is pressed', () => {
    render(<BatteryCheckIn />)
    const toggle = screen.getByRole('button', {
      name: /report anonymously/i,
    })
    fireEvent.click(toggle)
    expect(screen.getByText('Anonymous')).toBeInTheDocument()
  })

  it('increases energy on ArrowUp keypress', () => {
    render(<BatteryCheckIn initialEnergy={50} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowUp' })
    expect(slider).toHaveAttribute('aria-valuenow', '51')
  })

  it('decreases energy on ArrowDown keypress', () => {
    render(<BatteryCheckIn initialEnergy={50} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowDown' })
    expect(slider).toHaveAttribute('aria-valuenow', '49')
  })

  it('jumps to 0 on Home and 100 on End', () => {
    render(<BatteryCheckIn initialEnergy={50} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(slider).toHaveAttribute('aria-valuenow', '0')
    fireEvent.keyDown(slider, { key: 'End' })
    expect(slider).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps to 0..100 — ArrowDown at 0 stays at 0', () => {
    render(<BatteryCheckIn initialEnergy={0} />)
    const slider = screen.getByRole('slider')
    fireEvent.keyDown(slider, { key: 'ArrowDown' })
    expect(slider).toHaveAttribute('aria-valuenow', '0')
  })

  it('invokes onSubmit with the current state when Submit is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<BatteryCheckIn initialEnergy={75} onSubmit={onSubmit} />)
    const submit = screen.getByRole('button', { name: /^submit/i })
    fireEvent.click(submit)
    // Microtask boundary so the async onSubmit resolves
    await Promise.resolve()
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        energy: 75,
        anonMode: false,
        source: 'web',
      }),
    )
  })

  it('shows the success state after a successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<BatteryCheckIn onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^submit/i }))
    // wait for two microtask ticks (submit + state update)
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText(/thank you/i)).toBeInTheDocument()
  })

  it('shows an error message when onSubmit throws', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new Error('backend exploded'))
    render(<BatteryCheckIn onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /^submit/i }))
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByRole('alert')).toHaveTextContent(/backend exploded/i)
  })
})
