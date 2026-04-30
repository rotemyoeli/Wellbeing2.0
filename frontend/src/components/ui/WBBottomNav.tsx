/**
 * WBBottomNav — Mobile bottom tab navigation.
 *
 * Phase 6B: Replaces the floating top ViewSwitcher with a native-quality
 * bottom navigation bar. Respects safe-area-inset-bottom, uses 44px+
 * touch targets, and is RTL-aware.
 */
import { t } from '../../lib/i18n'

export type TabId = 'home' | 'checkin' | 'updates' | 'manage'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  roleGate?: string[]
}

interface Props {
  current: TabId
  onNavigate: (tab: TabId) => void
  userRole?: string
}

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

const CheckInIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="3" />
    <line x1="12" y1="14" x2="12" y2="18" />
  </svg>
)

const UpdatesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

const ManageIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

export default function WBBottomNav({ current, onNavigate, userRole }: Props) {
  const tabs: Tab[] = [
    { id: 'home', label: t('nav_home'), icon: <HomeIcon /> },
    { id: 'checkin', label: t('nav_report'), icon: <CheckInIcon /> },
    { id: 'updates', label: t('nav_updates'), icon: <UpdatesIcon /> },
    { id: 'manage', label: t('nav_manage'), icon: <ManageIcon />, roleGate: ['manager', 'admin'] },
  ]

  const visibleTabs = tabs.filter(tab => {
    if (!tab.roleGate) return true
    return userRole && tab.roleGate.includes(userRole)
  })

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-sm border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {visibleTabs.map(tab => {
          const active = current === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigate(tab.id)}
              aria-current={active ? 'page' : undefined}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5
                min-h-[56px] pt-1.5 pb-1
                transition-colors duration-100 outline-none
                focus-visible:shadow-focus
                no-tap-highlight
                ${active
                  ? 'text-accent-700'
                  : 'text-ink-400 hover:text-ink-700'
                }
              `}
            >
              <span className={active ? 'scale-105 transition-transform' : 'transition-transform'}>
                {tab.icon}
              </span>
              <span className={`text-[10px] font-medium leading-tight ${active ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
