/**
 * C2 — Alert detail with 3-stage ack workflow.
 */
import { useState } from 'react'
import WBAlertType from '../components/ui/WBAlertType'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBSectionLabel from '../components/ui/WBSectionLabel'
import WBStatusPill from '../components/ui/WBStatusPill'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { Alert } from '../types'

interface Props {
  alert: Alert
  onBack: () => void
  onClosed: () => void
}

const statusLabels = { open: 'c2_statusOpen', ack1: 'c2_statusSeen', ack2: 'c2_statusContacted', closed: 'c2_statusClosed' } as const

export default function AlertDetailPage({ alert: initialAlert, onBack, onClosed }: Props) {
  const { user } = useAuth()
  const [alert, setAlert] = useState(initialAlert)
  const [note, setNote] = useState('')
  const [publishToTeam, setPublishToTeam] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const created = new Date(alert.created_at)
  const mins = Math.round((Date.now() - created.getTime()) / 60000)

  const ack = async (step: 1 | 2 | 3) => {
    setSubmitting(true)
    setError('')
    try {
      const updated = await api.ackAlert(
        alert.alert_id,
        step,
        step === 3 ? note.trim() : undefined,
        step === 3 ? publishToTeam : undefined,
        step === 3 && publishToTeam ? user?.department_id || '' : undefined,
      )
      setAlert(updated)
      if (step === 3) onClosed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Timeline steps
  const steps = [
    { label: t('c2_statusOpen'), done: true },
    { label: t('c2_statusSeen'), done: alert.status !== 'open' },
    { label: t('c2_statusContacted'), done: alert.status === 'ack2' || alert.status === 'closed' },
    { label: t('c2_statusClosed'), done: alert.status === 'closed' },
  ]

  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6 overflow-y-auto">
      {/* Header */}
      <button type="button" onClick={onBack} className="text-caption text-accent-700 self-start mb-4">
        ← {t('c2_cancel')}
      </button>

      <div className="flex items-center gap-2 mb-2">
        <WBAlertType type={alert.type} label={alert.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh')} />
        <WBStatusPill status={alert.status} label={t(statusLabels[alert.status])} />
      </div>

      <h1 className="text-h2 font-semibold text-ink-900">
        {t('c2_anonHeader', { type: alert.type === 'low' ? t('c2_typeLow') : t('c2_typeHigh') })}
      </h1>
      <p className="text-caption text-ink-500 mt-1">{mins}m ago</p>

      {/* Timeline */}
      <WBCard className="mt-6" padding={16}>
        <div className="flex flex-col gap-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full border-2 ${
                  s.done ? 'bg-teal-500 border-teal-500' : 'bg-surface border-line'
                }`} />
                {i < steps.length - 1 && <div className={`w-0.5 h-6 ${s.done ? 'bg-teal-500' : 'bg-line'}`} />}
              </div>
              <span className={`text-caption ${s.done ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </WBCard>

      {/* Stage-specific content */}
      {alert.status === 'open' && (
        <div className="mt-6 flex gap-2">
          <WBButton kind="secondary" onClick={() => ack(1)} disabled={submitting}>{t('c2_actionMarkSeen')}</WBButton>
        </div>
      )}

      {alert.status === 'ack1' && (
        <div className="mt-6 flex gap-2">
          <WBButton kind="secondary" onClick={() => ack(2)} disabled={submitting}>{t('c2_actionMarkContacted')}</WBButton>
        </div>
      )}

      {alert.status === 'ack2' && (
        <div className="mt-6">
          <WBSectionLabel>{t('c2_closureLabel')}</WBSectionLabel>
          <textarea
            className="w-full rounded-lg border border-line bg-surface p-3.5 text-body text-ink-900 outline-none focus:shadow-focus resize-none"
            rows={3}
            placeholder={t('c2_closureHint')}
            value={note}
            onChange={e => setNote(e.target.value)}
          />

          {/* TODO Phase 5C: The design intent is to make NOT publishing harder
              than publishing. Currently this is an optional checkbox defaulting
              to false. Phase 5C should redesign this as a guided post-closure
              publish flow where the manager must either publish or provide a
              non-publication reason. See HANDOFF.md §6 state machine and §10. */}
          <label className="flex items-start gap-3 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={publishToTeam}
              onChange={e => setPublishToTeam(e.target.checked)}
              className="mt-1 w-4 h-4 accent-accent-700"
            />
            <span className="text-caption text-ink-700">{t('c2_publishCheckbox')}</span>
          </label>

          <div className="flex gap-2 mt-6">
            <WBButton kind="ghost" onClick={onBack}>{t('c2_cancel')}</WBButton>
            <WBButton kind="primary" className="flex-1" disabled={!note.trim() || submitting} onClick={() => ack(3)}>
              {t('c2_confirmClose')}
            </WBButton>
          </div>
        </div>
      )}

      {alert.status === 'closed' && (
        <div className="mt-6">
          <WBCard sunken padding={16}>
            <p className="text-body text-ink-700 italic">"{alert.closure_note}"</p>
            <p className="text-micro text-ink-400 mt-2">Closed · {alert.closed_at ? new Date(alert.closed_at).toLocaleString() : ''}</p>
          </WBCard>
          <p className="text-caption text-ink-400 mt-4 text-center">This alert is closed. Kept in audit log.</p>
        </div>
      )}

      {error && <p className="text-caption text-alert-low-fg mt-4">{error}</p>}
    </div>
  )
}
