/**
 * Admin Settings — Premium redesign.
 *
 * Visual-first: gradient hero with live stats ring, section cards with
 * gradient icons, polished forms, timeline audit log.
 */
import React, { useCallback, useEffect, useState } from 'react'
import WBButton from '../components/ui/WBButton'
import { showToast } from '../components/ui/WBToast'
import WBInput from '../components/ui/WBInput'
import WBPage from '../components/ui/WBPage'
import WBTopBar from '../components/ui/WBTopBar'
import { api } from '../lib/api'
import { t } from '../lib/i18n'
import type { User } from '../types'

type Section = 'org' | 'users' | 'depts' | 'policies' | 'data' | 'system' | null

/* Clean SVG icon set — consistent 18px, 1.8 stroke, round caps */
const I = (ch: React.ReactNode) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ch}</svg>

const ICONS = {
  org: I(<><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" /><line x1="9" y1="15" x2="12" y2="15" /></>),
  users: I(<><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.85" /></>),
  depts: I(<><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></>),
  policies: I(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>),
  data: I(<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>),
  system: I(<><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></>),
}

const SECTION_META: { id: Exclude<Section, null>; icon: React.ReactNode; gradient: string }[] = [
  { id: 'org', icon: ICONS.org, gradient: 'from-accent-700 to-accent-500' },
  { id: 'users', icon: ICONS.users, gradient: 'from-teal-700 to-teal-500' },
  { id: 'depts', icon: ICONS.depts, gradient: 'from-accent-900 to-accent-700' },
  { id: 'policies', icon: ICONS.policies, gradient: 'from-teal-500 to-accent-500' },
  { id: 'data', icon: ICONS.data, gradient: 'from-accent-700 to-teal-700' },
  { id: 'system', icon: ICONS.system, gradient: 'from-ink-700 to-accent-900' },
]

const SECTION_TITLES: Record<string, string> = {
  org: 'settings_org', users: 'settings_users', depts: 'settings_depts',
  policies: 'settings_policies', data: 'settings_data', system: 'settings_system',
}

export default function SettingsPage() {
  const [open, setOpen] = useState<Section>(null)
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const toggle = (s: Section) => setOpen(prev => prev === s ? null : s)

  useEffect(() => { api.adminGetStats().then(setStats).catch(() => {}) }, [])

  return (
    <WBPage>
      <WBTopBar title={t('settings_title')} />
      <div className="px-5 pt-3 pb-4">
        {/* ═══ HERO ═══ */}
        <div className="rounded-2xl bg-gradient-to-br from-accent-900 via-accent-700 to-teal-700 p-5 shadow-lg mb-5 overflow-hidden relative">
          <div className="absolute -top-10 -end-10 w-36 h-36 rounded-full border border-white/5" />
          <div className="absolute -top-4 -end-4 w-24 h-24 rounded-full border border-white/5" />

          <div className="flex items-center gap-4">
            {/* Stats ring */}
            <div className="shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="var(--wb-teal-300)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={`${(stats ? (stats.consented_users as number) / Math.max(stats.total_users as number, 1) : 0) * 201} 201`}
                  transform="rotate(-90 40 40)" className="transition-all duration-700" />
                <text x="40" y="38" textAnchor="middle" className="fill-white font-bold" style={{ fontSize: 18 }}>
                  {stats ? String(stats.total_users) : '—'}
                </text>
                <text x="40" y="52" textAnchor="middle" className="fill-white/50" style={{ fontSize: 8 }}>
                  {t('settings_totalUsers')}
                </text>
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-[20px] font-bold text-white">{t('settings_title')}</h1>
              <p className="text-caption text-white/60 mt-1">{t('settings_sub')}</p>
              {stats && (
                <div className="flex gap-3 mt-3">
                  <span className="text-micro text-white/40">{stats.total_checkins as number} {t('c1_kpiCheckIns')}</span>
                  <span className="text-micro text-white/40">{stats.open_alerts as number} {t('c1_openAlerts')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SECTION CARDS ═══ */}
        <div className="flex flex-col gap-3">
          {SECTION_META.map(sec => (
            <div key={sec.id}>
              <button type="button" onClick={() => toggle(sec.id)}
                className={`w-full flex items-center gap-3 rounded-xl border p-4 text-start transition-all no-tap-highlight
                  ${open === sec.id ? 'border-accent-300 shadow-md bg-surface' : 'border-line bg-surface hover:shadow-sm'}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${sec.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                  {sec.icon}
                </div>
                <span className="flex-1 text-[15px] font-semibold text-ink-900">{t(SECTION_TITLES[sec.id!] || '')}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="2"
                  className={`transition-transform duration-200 ${open === sec.id ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {open === sec.id && (
                <div className="mt-2 rounded-xl border border-line bg-surface p-4 shadow-sm animate-slideUp">
                  {sec.id === 'org' && <OrgSection />}
                  {sec.id === 'users' && <UsersSection />}
                  {sec.id === 'depts' && <DeptsSection />}
                  {sec.id === 'policies' && <PoliciesSection />}
                  {sec.id === 'data' && <DataSection />}
                  {sec.id === 'system' && <SystemSection />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </WBPage>
  )
}

/* ═══ Section 1: Organization ═══ */
function OrgSection() {
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
      if (o) { setName((o.name as string)||''); setLogoUrl((o.logo_url as string)||''); setAddress((o.address as string)||''); setPhone((o.phone as string)||''); setEmail((o.email as string)||'') }
    }).catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try { await api.adminUpdateOrg({ name, logo_url: logoUrl, address, phone, email }); setMsg(t('settings_saved')); showToast(t('toast_saved')) }
    catch { setMsg(t('b1_errNet')) }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {logoUrl && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sunken">
          <img src={logoUrl} alt="Logo" className="h-14 w-auto rounded-lg" />
          <p className="text-caption text-ink-500">{t('settings_orgName')}: {name || '—'}</p>
        </div>
      )}
      <WBInput label={t('settings_orgName')} value={name} onChange={e => setName(e.target.value)} />
      <WBInput label={t('settings_logoUrl')} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." dir="ltr" />
      <WBInput label={t('settings_address')} value={address} onChange={e => setAddress(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <WBInput label={t('settings_phone')} value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
        <WBInput label={t('settings_email')} value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
      </div>
      {msg && <p className={`text-caption ${msg === t('settings_saved') ? 'text-teal-600' : 'text-alert-low-fg'}`}>{msg}</p>}
      <WBButton kind="primary" onClick={save} disabled={saving} full>{saving ? '...' : t('settings_save')}</WBButton>
    </div>
  )
}

/* ═══ Section 2: Users ═══ */
function UsersSection() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState(''); const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('employee'); const [newDept, setNewDept] = useState('')

  const refresh = useCallback(() => {
    setLoading(true)
    const p: Record<string, string> = {}; if (search) p.search = search
    api.adminListUsers(p).then(r => setUsers(r.items)).catch(() => {}).finally(() => setLoading(false))
  }, [search])
  useEffect(() => { refresh() }, [refresh])

  const addUser = async () => {
    try { await api.adminCreateUser({ displayName: newName, email: newEmail, role: newRole, departmentId: newDept || undefined }); setShowAdd(false); setNewName(''); setNewEmail(''); refresh() } catch {}
  }
  const toggleActive = async (u: User) => { await api.adminUpdateUser(u.user_id, { isActive: !u.is_active }); refresh() }

  // Count by role
  const byRole = users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc }, {})

  return (
    <div>
      {/* Quick stats */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {Object.entries(byRole).map(([role, count]) => (
          <div key={role} className="shrink-0 rounded-lg bg-gradient-to-br from-accent-50 to-surface border border-accent-100 px-3 py-2 text-center">
            <p className="text-[18px] font-bold text-ink-900">{count}</p>
            <p className="text-[9px] text-ink-400 uppercase tracking-widest">{role}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--wb-ink-400)" strokeWidth="2" className="absolute start-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="w-full rounded-xl border border-line bg-surface ps-9 pe-3 py-2.5 text-caption outline-none focus:border-accent-700 focus:shadow-focus transition"
            placeholder={t('settings_searchUsers')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="button" onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-sm no-tap-highlight">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-teal-100/30 to-surface border border-teal-300 flex flex-col gap-3">
          <WBInput label={t('settings_userName')} value={newName} onChange={e => setNewName(e.target.value)} />
          <WBInput label={t('settings_email')} value={newEmail} onChange={e => setNewEmail(e.target.value)} dir="ltr" />
          <select className="rounded-xl border border-line bg-surface px-3 py-2.5 text-caption outline-none focus:border-accent-700" value={newRole} onChange={e => setNewRole(e.target.value)}>
            <option value="employee">Employee</option><option value="manager">Manager</option>
            <option value="admin">Admin</option><option value="social_worker">Social Worker</option>
          </select>
          <WBInput label={t('settings_dept')} value={newDept} onChange={e => setNewDept(e.target.value)} />
          <WBButton kind="primary" size="sm" onClick={addUser} disabled={!newName} full>{t('settings_addUser')}</WBButton>
        </div>
      )}

      {loading ? <p className="text-caption text-ink-400 py-6 text-center">...</p> : (
        <div className="rounded-xl border border-line overflow-hidden">
          {users.map((u, i) => (
            <div key={u.user_id} className={`flex items-center gap-3 px-4 py-3 ${i < users.length - 1 ? 'border-b border-line' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-100 to-accent-50 flex items-center justify-center text-caption font-bold text-accent-700 shrink-0">
                {u.display_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium text-ink-900 truncate">{u.display_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-pill bg-accent-50 text-accent-700 font-medium uppercase">{u.role}</span>
                  <span className="text-micro text-ink-400">{u.department_id || '—'}</span>
                </div>
              </div>
              <button type="button" onClick={() => toggleActive(u)}
                className={`text-micro px-2.5 py-1 rounded-pill font-medium transition no-tap-highlight
                  ${u.is_active ? 'bg-teal-100 text-teal-700' : 'bg-alert-low-bg text-alert-low-fg'}`}>
                {u.is_active ? 'Active' : 'Off'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══ Section 3: Departments ═══ */
function DeptsSection() {
  const [depts, setDepts] = useState<Record<string, unknown>[]>([])
  const [newName, setNewName] = useState(''); const [newSlug, setNewSlug] = useState('')

  const refresh = () => { api.adminListDepts().then(r => setDepts(r.items)).catch(() => {}) }
  useEffect(() => { refresh() }, [])

  const add = async () => { if (!newName || !newSlug) return; await api.adminCreateDept({ name: newName, slug: newSlug }); setNewName(''); setNewSlug(''); refresh() }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input className="flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-caption outline-none focus:border-accent-700 transition" placeholder={t('settings_deptName')} value={newName} onChange={e => setNewName(e.target.value)} />
        <input className="w-28 rounded-xl border border-line bg-surface px-3 py-2.5 text-caption outline-none font-mono focus:border-accent-700 transition" placeholder="slug" dir="ltr" value={newSlug} onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
        <button type="button" onClick={add} disabled={!newName || !newSlug}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-700 to-accent-500 flex items-center justify-center text-white shadow-sm shrink-0 disabled:opacity-40 no-tap-highlight">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        </button>
      </div>
      <div className="rounded-xl border border-line overflow-hidden">
        {depts.map((d, i) => (
          <div key={d.dept_id as string} className={`flex items-center gap-3 px-4 py-3 ${i < depts.length - 1 ? 'border-b border-line' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center text-caption font-bold text-teal-700 shrink-0">
              {(d.name as string).charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-caption font-medium text-ink-900">{d.name as string}</p>
              <p className="text-micro text-ink-400 font-mono">{d.slug as string}</p>
            </div>
            <span className={`text-micro px-2.5 py-1 rounded-pill font-medium ${d.is_active ? 'bg-teal-100 text-teal-700' : 'bg-ink-200 text-ink-500'}`}>
              {d.is_active ? 'Active' : 'Off'}
            </span>
          </div>
        ))}
        {depts.length === 0 && <p className="text-caption text-ink-400 py-6 text-center">{t('c1_emptyDashboard')}</p>}
      </div>
    </div>
  )
}

/* ═══ Section 4: Policies ═══ */
function PoliciesSection() {
  const [policies, setPolicies] = useState<Record<string, unknown>[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState('')

  useEffect(() => { api.adminGetPolicies().then(r => setPolicies(r.policies)).catch(() => {}) }, [])

  const save = async () => {
    setSaving(true); setMsg('')
    try { const r = await api.adminUpdatePolicies(edits); setPolicies(r.policies); setEdits({}); setMsg(t('settings_saved')); showToast(t('toast_saved')) }
    catch { setMsg(t('b1_errNet')) }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      {policies.map(p => {
        const key = p.key as string
        const val = key in edits ? edits[key] : (p.value as string)
        const changed = key in edits
        return (
          <div key={key} className={`rounded-xl p-3 border transition ${changed ? 'border-accent-300 bg-accent-50/30' : 'border-line bg-sunken/30'}`}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-micro text-ink-500 font-semibold uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
              {changed && <span className="text-[8px] text-accent-700 bg-accent-100 px-1.5 py-0.5 rounded-pill font-semibold">CHANGED</span>}
            </div>
            <input className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-caption font-mono outline-none focus:border-accent-700 transition" dir="ltr"
              value={val} onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))} />
            <p className="text-micro text-ink-400 mt-1">{p.description as string}</p>
          </div>
        )
      })}
      {msg && <p className={`text-caption ${msg === t('settings_saved') ? 'text-teal-600' : 'text-alert-low-fg'}`}>{msg}</p>}
      <WBButton kind="primary" onClick={save} disabled={saving || Object.keys(edits).length === 0} full>
        {saving ? '...' : t('settings_save')}
      </WBButton>
    </div>
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
    <div>
      {stats && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <KpiBox label={t('settings_totalUsers')} value={`${stats.total_users}`} gradient="from-accent-50 to-surface" />
            <KpiBox label={t('c1_kpiCheckIns')} value={`${stats.total_checkins}`} gradient="from-teal-100 to-surface" />
            <KpiBox label={t('c1_openAlerts')} value={`${stats.open_alerts}`} gradient="from-alert-low-bg to-surface" />
            <KpiBox label={t('settings_closedAlerts')} value={`${stats.closed_alerts}`} gradient="from-teal-100 to-surface" />
            <KpiBox label={t('settings_teamUpdates')} value={`${stats.total_updates}`} gradient="from-accent-50 to-surface" />
            <KpiBox label={t('settings_consented')} value={`${stats.consented_users}`} gradient="from-teal-100 to-surface" />
          </div>

          {/* Department bars */}
          {(stats.departments as Record<string, unknown>[])?.length > 0 && (
            <div className="mb-5">
              <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-3">{t('c1_distributionTitle')}</p>
              <div className="flex flex-col gap-2">
                {(stats.departments as Record<string, unknown>[]).map((d: Record<string, unknown>) => {
                  const maxCi = Math.max(...(stats.departments as Record<string, unknown>[]).map((x: Record<string, unknown>) => x.checkins as number || 1))
                  const pct = ((d.checkins as number) / maxCi) * 100
                  return (
                    <div key={d.slug as string}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-caption font-medium text-ink-900">{d.name as string}</span>
                        <span className="text-micro text-ink-400">{d.users as number} users · {d.checkins as number}</span>
                      </div>
                      <div className="h-2 bg-sunken rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-accent-700 to-teal-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Export */}
      <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-2">Export CSV</p>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(['users', 'checkins', 'alerts'] as const).map(type => (
          <a key={type} href={api.adminExportUrl(type)}
            className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface py-3 text-accent-700 hover:shadow-sm transition no-tap-highlight">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            <span className="text-micro font-medium capitalize">{type}</span>
          </a>
        ))}
      </div>

      {/* Audit timeline */}
      <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-2">{t('settings_auditLog')}</p>
      <div className="rounded-xl border border-line overflow-hidden max-h-64 overflow-y-auto">
        {audit.map((e, i) => (
          <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${i < audit.length - 1 ? 'border-b border-line' : ''}`}>
            <div className="flex flex-col items-center shrink-0 pt-0.5">
              <div className="w-2 h-2 rounded-full bg-accent-300" />
              {i < audit.length - 1 && <div className="w-0.5 h-full bg-line mt-0.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-caption text-ink-700 truncate">{e.action as string}</p>
              <p className="text-[9px] text-ink-400">{e.created_at ? new Date(e.created_at as string).toLocaleString() : ''}</p>
            </div>
          </div>
        ))}
        {audit.length === 0 && <p className="text-caption text-ink-400 py-4 text-center">—</p>}
      </div>
    </div>
  )
}

/* ═══ Section 6: System ═══ */
function SystemSection() {
  const [info, setInfo] = useState<Record<string, unknown> | null>(null)
  useEffect(() => { api.adminGetSystemInfo().then(setInfo).catch(() => {}) }, [])

  if (!info) return <p className="text-caption text-ink-400 py-4 text-center">...</p>

  const rows: { label: string; value: string; warn?: boolean; badge?: string }[] = [
    { label: 'API Version', value: info.version as string, badge: 'teal' },
    { label: 'Dev Mode', value: info.dev_mode ? 'ON' : 'OFF', warn: info.dev_mode as boolean },
    { label: 'Demo Mode', value: info.demo_mode ? 'ON' : 'OFF' },
    { label: 'Consent Version', value: info.consent_version as string },
    { label: t('settings_consented'), value: `${info.consented_users} / ${info.total_users}` },
    { label: 'Anonymity Policy', value: info.anonymity_policy as string },
  ]

  return (
    <div>
      <div className="rounded-xl border border-line overflow-hidden">
        {rows.map((r, i) => (
          <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}>
            <span className="text-caption text-ink-500">{r.label}</span>
            <span className={`text-caption font-medium ${r.warn ? 'text-alert-low-fg bg-alert-low-bg px-2 py-0.5 rounded-pill' : 'text-ink-900'}`}>
              {r.value}
            </span>
          </div>
        ))}
      </div>
      {(info.cors_origins as string[])?.length > 0 && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <p className="text-micro text-ink-500 font-semibold uppercase tracking-widest mb-1">CORS Origins</p>
          <div className="flex flex-wrap gap-1">
            {(info.cors_origins as string[]).map((o, i) => (
              <span key={i} className="text-micro bg-sunken px-2 py-0.5 rounded-pill text-ink-700 font-mono">{o}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ Shared components ═══ */
function KpiBox({ label, value, gradient }: { label: string; value: string; gradient: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${gradient} border border-line p-3 text-center`}>
      <p className="text-[20px] font-bold text-ink-900 leading-tight">{value}</p>
      <p className="text-[8px] text-ink-400 uppercase tracking-widest mt-0.5">{label}</p>
    </div>
  )
}
