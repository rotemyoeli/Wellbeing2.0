/**
 * Admin Settings — Organization, Users, Departments, Policies, Stats, System.
 *
 * Premium visual design matching the dashboard. Admin-only (role=admin).
 * 5 collapsible sections with gradient headers and glass-morphic cards.
 */
import { useCallback, useEffect, useState } from 'react'
import WBButton from '../components/ui/WBButton'
import WBCard from '../components/ui/WBCard'
import WBInput from '../components/ui/WBInput'
import WBPage from '../components/ui/WBPage'
import WBTopBar from '../components/ui/WBTopBar'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { User } from '../types'

type Section = 'org' | 'users' | 'depts' | 'policies' | 'data' | 'system' | null

export default function SettingsPage() {
  const [open, setOpen] = useState<Section>(null)
  const toggle = (s: Section) => setOpen(prev => prev === s ? null : s)

  return (
    <WBPage>
      <WBTopBar title={t('settings_title')} />
      <div className="px-5 pt-3 pb-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-accent-900 via-accent-700 to-accent-500 p-5 shadow-lg mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-white">{t('settings_title')}</h1>
              <p className="text-caption text-white/60">{t('settings_sub')}</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-3">
          <SectionToggle icon="🏥" title={t('settings_org')} isOpen={open === 'org'} onToggle={() => toggle('org')} />
          {open === 'org' && <OrgSection />}

          <SectionToggle icon="👥" title={t('settings_users')} isOpen={open === 'users'} onToggle={() => toggle('users')} />
          {open === 'users' && <UsersSection />}

          <SectionToggle icon="🏢" title={t('settings_depts')} isOpen={open === 'depts'} onToggle={() => toggle('depts')} />
          {open === 'depts' && <DeptsSection />}

          <SectionToggle icon="⚙" title={t('settings_policies')} isOpen={open === 'policies'} onToggle={() => toggle('policies')} />
          {open === 'policies' && <PoliciesSection />}

          <SectionToggle icon="📊" title={t('settings_data')} isOpen={open === 'data'} onToggle={() => toggle('data')} />
          {open === 'data' && <DataSection />}

          <SectionToggle icon="🔒" title={t('settings_system')} isOpen={open === 'system'} onToggle={() => toggle('system')} />
          {open === 'system' && <SystemSection />}
        </div>
      </div>
    </WBPage>
  )
}

function SectionToggle({ icon, title, isOpen, onToggle }: { icon: string; title: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className={`w-full flex items-center gap-3 rounded-xl border p-4 text-start transition-all no-tap-highlight
        ${isOpen ? 'bg-accent-50 border-accent-300 shadow-sm' : 'bg-surface border-line hover:shadow-sm'}`}>
      <span className="text-[20px]">{icon}</span>
      <span className="flex-1 text-[15px] font-semibold text-ink-900">{title}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="2"
        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

/* ═══ Section 1: Organization ═══ */
function OrgSection() {
  const [_org, setOrg] = useState<Record<string, unknown> | null>(null)
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.adminGetOrg().then(r => {
      const o = r.organization
      if (o) {
        setOrg(o)
        setName((o.name as string) || '')
        setLogoUrl((o.logo_url as string) || '')
        setAddress((o.address as string) || '')
        setPhone((o.phone as string) || '')
        setEmail((o.email as string) || '')
      }
    }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const r = await api.adminUpdateOrg({ name, logo_url: logoUrl, address, phone, email })
      setOrg(r.organization)
      setMsg(t('settings_saved'))
    } catch { setMsg(t('b1_errNet')) }
    finally { setSaving(false) }
  }

  return (
    <WBCard padding={16}>
      <div className="flex flex-col gap-3">
        <WBInput label={t('settings_orgName')} value={name} onChange={e => setName(e.target.value)} />
        <WBInput label={t('settings_logoUrl')} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
        {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 w-auto rounded-lg border border-line self-start" />}
        <WBInput label={t('settings_address')} value={address} onChange={e => setAddress(e.target.value)} />
        <WBInput label={t('settings_phone')} value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        <WBInput label={t('settings_email')} value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
        {msg && <p className="text-caption text-teal-600">{msg}</p>}
        <WBButton kind="primary" onClick={save} disabled={saving}>{saving ? '...' : t('settings_save')}</WBButton>
      </div>
    </WBCard>
  )
}

/* ═══ Section 2: Users ═══ */
function UsersSection() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('employee')
  const [newDept, setNewDept] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search) params.search = search
    api.adminListUsers(params).then(r => setUsers(r.items)).catch(() => {}).finally(() => setLoading(false))
  }, [search])

  useEffect(() => { refresh() }, [refresh])

  const addUser = async () => {
    try {
      await api.adminCreateUser({ displayName: newName, email: newEmail, role: newRole, departmentId: newDept || undefined })
      setShowAdd(false); setNewName(''); setNewEmail(''); refresh()
    } catch {}
  }

  const toggleActive = async (u: User) => {
    await api.adminUpdateUser(u.user_id, { isActive: !u.is_active })
    refresh()
  }

  return (
    <WBCard padding={16}>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-caption outline-none focus:border-accent-700"
          placeholder={t('settings_searchUsers')} value={search} onChange={e => setSearch(e.target.value)} />
        <WBButton kind="secondary" size="sm" onClick={() => setShowAdd(!showAdd)}>+</WBButton>
      </div>

      {showAdd && (
        <div className="mb-3 p-3 rounded-lg bg-accent-50 border border-accent-100 flex flex-col gap-2">
          <WBInput label={t('settings_userName')} value={newName} onChange={e => setNewName(e.target.value)} />
          <WBInput label={t('settings_email')} value={newEmail} onChange={e => setNewEmail(e.target.value)} dir="ltr" />
          <select className="rounded-lg border border-line bg-surface px-3 py-2 text-caption" value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="social_worker">Social Worker</option>
          </select>
          <WBInput label={t('settings_dept')} value={newDept} onChange={e => setNewDept(e.target.value)} />
          <WBButton kind="primary" size="sm" onClick={addUser} disabled={!newName}>{t('settings_addUser')}</WBButton>
        </div>
      )}

      {loading ? <p className="text-caption text-ink-400 py-4 text-center">...</p> : (
        <div className="flex flex-col gap-1">
          {users.map(u => (
            <div key={u.user_id} className="flex items-center gap-2 py-2 border-b border-line last:border-b-0">
              <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center text-micro font-bold text-accent-700 shrink-0">
                {u.display_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium text-ink-900 truncate">{u.display_name}</p>
                <p className="text-micro text-ink-400">{u.role} · {u.department_id || '—'}</p>
              </div>
              <button type="button" onClick={() => toggleActive(u)}
                className={`text-micro px-2 py-0.5 rounded-pill ${u.is_active ? 'bg-teal-100 text-teal-700' : 'bg-alert-low-bg text-alert-low-fg'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
        </div>
      )}
    </WBCard>
  )
}

/* ═══ Section 3: Departments ═══ */
function DeptsSection() {
  const [depts, setDepts] = useState<Record<string, unknown>[]>([])
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')

  const refresh = () => { api.adminListDepts().then(r => setDepts(r.items)).catch(() => {}) }
  useEffect(() => { refresh() }, [])

  const add = async () => {
    if (!newName || !newSlug) return
    await api.adminCreateDept({ name: newName, slug: newSlug })
    setNewName(''); setNewSlug(''); refresh()
  }

  return (
    <WBCard padding={16}>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-caption outline-none" placeholder={t('settings_deptName')} value={newName} onChange={e => setNewName(e.target.value)} />
        <input className="w-24 rounded-lg border border-line bg-surface px-3 py-2 text-caption outline-none" placeholder="slug" dir="ltr" value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
        <WBButton kind="primary" size="sm" onClick={add} disabled={!newName || !newSlug}>+</WBButton>
      </div>
      <div className="flex flex-col gap-1">
        {depts.map((d: Record<string, unknown>) => (
          <div key={d.dept_id as string} className="flex items-center gap-2 py-2 border-b border-line last:border-b-0">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-micro font-bold text-teal-700 shrink-0">
              {(d.name as string).charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-caption font-medium text-ink-900">{d.name as string}</p>
              <p className="text-micro text-ink-400 font-mono">{d.slug as string}</p>
            </div>
            <span className={`text-micro px-2 py-0.5 rounded-pill ${d.is_active ? 'bg-teal-100 text-teal-700' : 'bg-ink-200 text-ink-500'}`}>
              {d.is_active ? 'Active' : 'Off'}
            </span>
          </div>
        ))}
      </div>
    </WBCard>
  )
}

/* ═══ Section 4: Policies ═══ */
function PoliciesSection() {
  const [policies, setPolicies] = useState<Record<string, unknown>[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.adminGetPolicies().then(r => setPolicies(r.policies)).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      const r = await api.adminUpdatePolicies(edits)
      setPolicies(r.policies); setEdits({}); setMsg(t('settings_saved'))
    } catch { setMsg(t('b1_errNet')) }
    finally { setSaving(false) }
  }

  return (
    <WBCard padding={16}>
      <div className="flex flex-col gap-3">
        {policies.map(p => {
          const key = p.key as string
          const val = key in edits ? edits[key] : (p.value as string)
          return (
            <div key={key}>
              <label className="text-micro text-ink-500 font-medium uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
              <input className="w-full mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-caption outline-none focus:border-accent-700" dir="ltr"
                value={val} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
              <p className="text-micro text-ink-400 mt-0.5">{p.description as string}</p>
            </div>
          )
        })}
        {msg && <p className="text-caption text-teal-600">{msg}</p>}
        <WBButton kind="primary" onClick={save} disabled={saving || Object.keys(edits).length === 0}>
          {saving ? '...' : t('settings_save')}
        </WBButton>
      </div>
    </WBCard>
  )
}

/* ═══ Section 5: Data & Stats ═══ */
function DataSection() {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [audit, setAudit] = useState<Record<string, unknown>[]>([])

  useEffect(() => {
    api.adminGetStats().then(setStats).catch(() => {})
    api.adminGetAuditLog(20).then(r => setAudit(r.items)).catch(() => {})
  }, [])

  return (
    <WBCard padding={16}>
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MiniStat label={t('settings_totalUsers')} value={`${stats.total_users}`} />
            <MiniStat label={t('c1_kpiCheckIns')} value={`${stats.total_checkins}`} />
            <MiniStat label={t('c1_openAlerts')} value={`${stats.open_alerts}`} />
            <MiniStat label={t('settings_closedAlerts')} value={`${stats.closed_alerts}`} />
            <MiniStat label={t('settings_teamUpdates')} value={`${stats.total_updates}`} />
            <MiniStat label={t('settings_consented')} value={`${stats.consented_users}`} />
          </div>

          {/* Department breakdown */}
          {(stats.departments as Record<string, unknown>[])?.length > 0 && (
            <div className="mb-4">
              <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-2">{t('c1_distributionTitle')}</p>
              {(stats.departments as Record<string, unknown>[]).map((d: Record<string, unknown>) => (
                <div key={d.slug as string} className="flex items-center justify-between py-1.5 border-b border-line last:border-b-0">
                  <span className="text-caption text-ink-700">{d.name as string}</span>
                  <span className="text-micro text-ink-400">{d.users as number} users · {d.checkins as number} check-ins</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Export */}
      <div className="flex gap-2 mb-4">
        <a href={api.adminExportUrl('users')} className="flex-1 text-center rounded-lg border border-line bg-surface py-2 text-caption text-accent-700 font-medium">CSV Users</a>
        <a href={api.adminExportUrl('checkins')} className="flex-1 text-center rounded-lg border border-line bg-surface py-2 text-caption text-accent-700 font-medium">CSV Check-ins</a>
        <a href={api.adminExportUrl('alerts')} className="flex-1 text-center rounded-lg border border-line bg-surface py-2 text-caption text-accent-700 font-medium">CSV Alerts</a>
      </div>

      {/* Audit log */}
      <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-2">{t('settings_auditLog')}</p>
      <div className="max-h-60 overflow-y-auto">
        {audit.map((e, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5 border-b border-line last:border-b-0">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-300 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-micro text-ink-700 truncate">{e.action as string}</p>
              <p className="text-[9px] text-ink-400">{e.created_at ? new Date(e.created_at as string).toLocaleString() : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </WBCard>
  )
}

/* ═══ Section 6: System ═══ */
function SystemSection() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null)
  useEffect(() => { api.adminGetSystemInfo().then(setInfo).catch(() => {}) }, [])

  if (!info) return null
  return (
    <WBCard padding={16}>
      <div className="flex flex-col gap-2">
        <InfoRow label="API Version" value={info.version as string} />
        <InfoRow label="Dev Mode" value={info.dev_mode ? 'ON' : 'OFF'} warn={info.dev_mode as boolean} />
        <InfoRow label="Demo Mode" value={info.demo_mode ? 'ON' : 'OFF'} />
        <InfoRow label="Consent Version" value={info.consent_version as string} />
        <InfoRow label={t('settings_consented')} value={`${info.consented_users} / ${info.total_users}`} />
        <InfoRow label="Anonymity Policy" value={info.anonymity_policy as string} />
        <InfoRow label="CORS Origins" value={(info.cors_origins as string[])?.join(', ') || '—'} />
      </div>
    </WBCard>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-accent-50 to-surface border border-accent-100 p-3">
      <p className="text-[10px] text-ink-400 uppercase tracking-widest">{label}</p>
      <p className="text-[22px] font-bold text-ink-900 leading-tight mt-0.5">{value}</p>
    </div>
  )
}

function InfoRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-line last:border-b-0">
      <span className="text-caption text-ink-500">{label}</span>
      <span className={`text-caption font-medium ${warn ? 'text-alert-low-fg' : 'text-ink-900'}`}>{value}</span>
    </div>
  )
}
