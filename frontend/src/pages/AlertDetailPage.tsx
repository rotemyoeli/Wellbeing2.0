/**
 * C2 — Alert detail with 3-stage ack workflow + guided publish flow.
 *
 * Phase 5C: After closing an alert, the manager is guided to publish
 * a team update. They must either publish or provide a non-publication
 * reason. This makes NOT publishing harder than publishing, per
 * HANDOFF.md §6 and §10 design intent.
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

type Stage = 'detail' | 'publish-prompt'

const statusLabels = { open: 'c2_statusOpen', ack1: 'c2_statusSeen', ack2: 'c2_statusContacted', closed: 'c2_statusClosed' } as const

export default function AlertDetailPage({ alert: initialAlert, onBack, onClosed }: Props) {
  const { user } = useAuth()
  const [alert, setAlert] = useState(initialAlert)
  const [stage, setStage] = useState<Stage>('detail')
  const [note, setNote] = useState('')
  const [publishContent, setPublishContent] = useState('')
  const [skipReason, setSkipReason] = useState('')
  const [showSkipForm, setShowSkipForm] = useState(false)
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
        false, // don't auto-publish on close — guided flow handles it
        undefined,
      )
      setAlert(updated)
      if (step === 3) {
        // After closing, show publish prompt instead of going back
        setPublishContent(note.trim())
        setStage('publish-prompt')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async () => {
    if (!publishContent.trim() || !user?.department_id) return
    setSubmitting(true)
    setError('')
    try {
      await api.publishClosure(alert.alert_id, user.department_id, publishContent.trim())
      onClosed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkipPublish = () => {
    if (!skipReason.trim()) return
    // Skip with reason — just go back. The closure stays unpublished
    // and will appear in C8 (unpublished closures review).
    onClosed()
  }

  // Timeline steps
  const steps = [
    { label: t('c2_statusOpen'), done: true },
    { label: t('c2_statusSeen'), done: alert.status !== 'open' },
    { label: t('c2_statusContacted'), done: alert.status === 'ack2' || alert.status === 'closed' },
    { label: t('c2_statusClosed'), done: alert.status === 'closed' },
  ]

  // ===== Post-closure publish prompt (Phase 5C) =====
  if (stage === 'publish-prompt') {
    return (
      <div className="min-h-screen bg-paper flex flex-col px-6 py-6">
        <WBSectionLabel>{t('c7_title')}</WBSectionLabel>
        <h1 className="text-h2 font-semibold text-ink-900 mt-2">{t('c7_hint')}</h1>

        {/* Editable publish content — pre-filled with closure note */}
        <textarea
          className="mt-4 w-full rounded-lg border border-ink-200 bg-surface p-3.5 text-body text-ink-900 outline-none focus:shadow-focus focus:border-accent-700 resize-none"
          rows={4}
          maxLength={500}
          placeholder={t('c7_placeholder')}
          value={publishContent}
          onChange={e => setPublishContent(e.target.value.slice(0, 500))}
        />
        <p className="text-caption font-mono text-ink-400 mt-1 text-end">
          {publishContent.length} {t('c7_counter')}
        </p>

        {/* Preview — what the team will see */}
        {publishContent.trim() && (
          <div className="mt-4">
            <WBSectionLabel>Preview</WBSectionLabel>
            <WBCard padding={14} className="!border-accent-300 !bg-accent-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-micro font-semibold text-teal-700">
                  {user?.display_name?.[0] || 'M'}
                </div>
                <span className="text-caption font-medium text-ink-700">{user?.display_name}</span>
              </div>
              <p className="text-[14px] text-ink-700 leading-relaxed">{publishContent}</p>
            </WBCard>
          </div>
        )}

        {error && <p className="text-caption text-alert-low-fg mt-3">{error}</p>}

        {/* Primary: publish. Secondary: skip (requires reason) */}
        <div className="flex-1" />

        <WBButton
          kind="primary"
          full
          className="mt-4"
          disabled={publishContent.trim().length < 10 || submitting}
          onClick={handlePublish}
        >
          {t('c7_publish')}
        </WBButton>

        {!showSkipForm ? (
          <button
            type="button"
            onClick={() => setShowSkipForm(true)}
            className="text-caption text-ink-400 text-center mt-3 py-2"
          >
            {t('b3_skip')}
          </button>
        ) : (
          <div className="mt-4 rounded-lg border border-line bg-sunken p-3">
            <p className="text-caption text-ink-500 mb-2">{t('c2_closureHint')}</p>
            <textarea
              className="w-full rounded-md border border-line bg-surface p-2.5 text-caption text-ink-900 outline-none resize-none"
              rows={2}
              placeholder={t('c2_closureHint')}
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
            />
            <WBButton
              kind="ghost"
              size="sm"
              className="mt-2"
              disabled={!skipReason.trim()}
              onClick={handleSkipPublish}
            >
              {t('b3_skip')}
            </WBButton>
          </div>
        )}
      </div>
    )
  }

  // ===== Alert detail =====
  return (
    <div className="min-h-screen bg-paper flex flex-col px-6 py-6 overflow-y-auto">
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
      <p className="text-caption text-ink-500 mt-1">{mins}m</p>

      {/* Timeline */}
      <WBCard className="mt-6" padding={16}>
        <div className="flex flex-col gap-0">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full border-2 ${s.done ? 'bg-teal-500 border-teal-500' : 'bg-surface border-line'}`} />
                {i < steps.length - 1 && <div className={`w-0.5 h-6 ${s.done ? 'bg-teal-500' : 'bg-line'}`} />}
              </div>
              <span className={`text-caption ${s.done ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </WBCard>

      {alert.status === 'open' && (
        <div className="mt-6">
          <WBButton kind="secondary" onClick={() => ack(1)} disabled={submitting}>{t('c2_actionMarkSeen')}</WBButton>
        </div>
      )}

      {alert.status === 'ack1' && (
        <div className="mt-6">
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
            <p className="text-micro text-ink-400 mt-2">
              {alert.closed_at ? new Date(alert.closed_at).toLocaleString() : ''}
            </p>
          </WBCard>
          {alert.closure_published ? (
            <p className="text-caption text-teal-500 mt-3 text-center">{t('c8_published')}</p>
          ) : (
            <p className="text-caption text-ink-400 mt-3 text-center">{t('c8_unpublished')}</p>
          )}
        </div>
      )}

      {error && <p className="text-caption text-alert-low-fg mt-4">{error}</p>}
    </div>
  )
}
