/**
 * Shared TypeScript types for the wellbeing-app frontend.
 *
 * Wire format conventions:
 *   - REQUEST bodies use camelCase (matches Spec v2 §9.1)
 *   - RESPONSE bodies from `to_dict()` use snake_case
 */

export type AnonymityMode = 'identified' | 'anonymous'
export type CheckInSource = 'web' | 'sms' | 'wa' | 'email'
export type AlertStatus = 'open' | 'ack1' | 'ack2' | 'closed'
export type AlertType = 'low' | 'high'
export type UserRole = 'employee' | 'manager' | 'social_worker' | 'admin' | 'it_security'

/** REQUEST shape — camelCase. */
export interface CheckInPayload {
  energy: number
  anonMode: boolean
  supportQ?: boolean | null
  workloadQ?: boolean | null
  comment?: string | null
  shiftId?: string | null
  source?: CheckInSource
}

export interface CheckInResponse {
  checkInId: string
  timestamp: string
  alertCreated?: boolean
  alertType?: 'low' | 'high'
}

export interface Alert {
  alert_id: string
  check_in_id: string
  type: AlertType
  status: AlertStatus
  ack_by?: string | null
  ack_at?: string | null
  contacted_at?: string | null
  closed_at?: string | null
  escalated_at?: string | null
  closure_note?: string | null
  team_update_id?: string | null
  closure_published?: boolean
  created_at: string
}

export interface DashboardRoleRow {
  role: string
  count: number
  avg: number | null
  below_threshold: boolean
}

export interface DashboardTrendPoint {
  date: string
  count: number
  avg: number | null
}

export interface DashboardNudge {
  type: 'under_publish' | 'over_publish' | 'zero_closures' | 'decay'
  message: string
  severity: 'warning' | 'info'
}

export interface DashboardSummary {
  period_days: number
  total_checkins: number
  reporting_rate: number
  active_users: number
  unique_reporters: number
  avg_energy: number | null
  median_energy: number | null
  trend: DashboardTrendPoint[]
  role_breakdown: DashboardRoleRow[]
  aggregation_threshold: number
  closure_publish_rate: number | null
  total_closed_alerts: number
  total_published_closures: number
  open_alerts_count: number
  nudges: DashboardNudge[]
}

export interface User {
  user_id: string
  display_name: string
  role: UserRole
  department_id?: string | null
  is_active: boolean
  is_dev_mode?: boolean
}

export interface TeamUpdate {
  update_id: string
  author_id: string | null
  department_id: string
  content: string
  published_at: string | null
  is_active: boolean
  created_at: string
}

export interface ConsentStatus {
  hasConsent: boolean
  currentVersion: string
  consentedVersion: string | null
  consentedAt: string | null
}
