/**
 * LoginPage — two-step OTP login.
 *
 * Step 1: enter email → backend issues OTP → in dev, code prints to backend stdout
 * Step 2: enter the 6-digit code → backend returns JWT pair → AuthContext takes over
 *
 * Spec v2 §11 design directives:
 *   - Single-thumb, one-screen, large touch targets, font >=16px
 *   - Plain-language consent reminder visible (just below the form)
 *   - No legal jargon
 */

import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

type Step = 'request' | 'verify'

export default function LoginPage() {
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('request')
  const [contact, setContact] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!contact.trim()) {
      setError('Please enter your email address.')
      return
    }
    setSubmitting(true)
    try {
      await api.requestOtp(contact.trim(), 'email')
      setStep('verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send code.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (code.length !== 6) {
      setError('Code must be 6 digits.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.verifyOtp(contact.trim(), code)
      login(res.accessToken, res.refreshToken, res.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify code.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-10 pb-8">
      <h1 className="mb-1 text-2xl font-semibold text-ink-900">Wellbeing</h1>
      <p className="mb-8 text-sm text-ink-500">
        Sign in with your work email. We'll send you a one-time code.
      </p>

      {step === 'request' && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-3">
          <label htmlFor="contact" className="text-sm font-medium text-ink-700">
            Email
          </label>
          <input
            id="contact"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@hospital.org.il"
            required
            className="w-full rounded-2xl border border-ink-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-2xl bg-ink-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 no-tap-highlight"
          >
            {submitting ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}

      {step === 'verify' && (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
          <p className="text-sm text-ink-700">
            We sent a 6-digit code to <span className="font-medium">{contact}</span>.
          </p>
          <label htmlFor="code" className="text-sm font-medium text-ink-700">
            Code
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            required
            className="w-full rounded-2xl border border-ink-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="mt-2 w-full rounded-2xl bg-ink-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 no-tap-highlight"
          >
            {submitting ? 'Verifying…' : 'Sign in'}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep('request')
              setCode('')
              setError(null)
            }}
            className="text-sm text-ink-500 underline"
          >
            Use a different email
          </button>
        </form>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {/* Plain-language privacy reminder */}
      <p className="mt-10 text-xs leading-relaxed text-ink-500">
        Your wellbeing reports are not used for HR, pay, or promotion
        decisions. You can choose to report anonymously — when you do, your
        identity is hashed before submission and cannot be reversed.
      </p>
    </div>
  )
}
