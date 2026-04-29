/**
 * Auth screens: A1 (request OTP), A2 (verify OTP).
 */
import { useState } from 'react'
import WBBrand from '../components/ui/WBBrand'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBInput from '../components/ui/WBInput'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'

const DEV_USERS = [
  { label: 'Employee', role: 'employee' as const },
  { label: 'Manager', role: 'manager' as const },
  { label: 'Admin', role: 'admin' as const },
]

export default function LoginPage() {
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleDevSkip = (role: 'employee' | 'manager' | 'admin') => {
    const devUser = {
      user_id: `dev-${role}-${Date.now()}`,
      display_name: `Dev ${role}`,
      role,
      department_id: 'ward-b',
      is_active: true,
      is_dev_mode: true,
    }
    login('dev-token', 'dev-refresh', devUser)
  }

  const handleRequestOtp = async () => {
    if (!email.includes('@')) {
      setError(t('a1_errEmail'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.requestOtp(email)
      setStep('verify')
    } catch (e) {
      setError(e instanceof Error && e.message.includes('429') ? t('a1_errRate') : t('a1_errNet'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.verifyOtp(email, code)
      login(res.accessToken, res.refreshToken, res.user)
    } catch {
      setError(t('a2_errInvalid'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-8">
      <WBBrand size="lg" />

      {/* DEV MODE: skip login for UI review */}
      <div className="mt-6 rounded-lg border-2 border-dashed border-accent-300 bg-accent-50 p-4">
        <p className="text-caption font-semibold text-accent-700 mb-2">Dev Preview — skip login</p>
        <div className="flex gap-2">
          {DEV_USERS.map(u => (
            <button
              key={u.role}
              type="button"
              onClick={() => handleDevSkip(u.role)}
              className="flex-1 rounded-md bg-accent-700 text-white text-caption font-medium py-2 px-3"
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {step === 'request' ? (
        <div className="flex flex-col flex-1 mt-10">
          <h1 className="text-h1 font-bold text-ink-900">{t('a1_title')}</h1>
          <p className="text-body text-ink-500 mt-2">{t('a1_subtitle')}</p>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); handleRequestOtp() }}
          >
            <WBInput
              label={t('a1_emailLabel')}
              type="email"
              inputMode="email"
              placeholder={t('a1_emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error || undefined}
              dir="ltr"
            />
            <WBButton kind="primary" full disabled={loading || !email} type="submit">
              {loading ? '...' : t('a1_send')}
            </WBButton>
          </form>

          <div className="flex-1" />

          <WBCard sunken className="mt-8">
            <p className="text-caption text-ink-500 leading-relaxed">
              {t('a1_privacyReminder')}
            </p>
          </WBCard>
        </div>
      ) : (
        <div className="flex flex-col flex-1 mt-10">
          <h1 className="text-h1 font-bold text-ink-900">{t('a1_title')}</h1>
          <p className="text-body text-ink-500 mt-2">
            {t('a2_subtitle')} <span className="font-medium text-ink-700" dir="ltr">{email}</span>
          </p>

          <form
            className="mt-8 flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); handleVerifyOtp() }}
          >
            <WBInput
              label={t('a2_codeLabel')}
              type="text"
              inputMode="numeric"
              maxLength={6}
              mono
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={error || undefined}
              dir="ltr"
            />
            <WBButton kind="primary" full disabled={loading || code.length < 6} type="submit">
              {loading ? t('a2_submitting') : t('a2_signIn')}
            </WBButton>
          </form>

          <button
            type="button"
            onClick={() => { setStep('request'); setCode(''); setError('') }}
            className="text-caption text-accent-700 mt-4 self-start"
          >
            {t('a2_useDifferent')}
          </button>

          <div className="flex-1" />

          <WBCard sunken className="mt-8">
            <p className="text-caption text-ink-500 leading-relaxed">
              {t('a1_privacyReminder')}
            </p>
          </WBCard>
        </div>
      )}
    </div>
  )
}
