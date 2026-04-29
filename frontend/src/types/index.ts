/**
 * Shared TypeScript types for the wellbeing-app frontend.
 *
 * Wire format conventions:
 *   - REQUEST  bodies use camelCase (matches Spec v2 §9.1)
 *   - RESPONSE bodies from `to_dict()` methods use snake_case (matches
 *     Python convention; preserved on the wire to avoid serialiser glue)
 *
 * Frontend code accesses response fields as snake_case directly. Local
 * TS code uses camelCase. Don't translate at the boundary unless there's
 * a specific reason (and document it).
 */

export type AnonymityMode = 'identified' | 'anonymous'

export type CheckInSource = 'web' | 'sms' | 'wa' | 'email'

/** REQUEST shape — camelCase. */
export interface CheckInPayload {
  energy: number // 0..100
  anonMode: boolean
  supportQ?: boolean | null
  workloadQ?: boolean | null
  comment?: string | null
  shiftId?: string | null
  source?: CheckInSource
}

/** RESPONSE shape — camelCase (we control this serialiser). */
export interface CheckInResponse {
  checkInId: string
  timestamp: string
  alertCreated?: boolean
  alertType?: 'low' | 'high'
}

export type AlertStatus = 'open' | 'ack1' | 'ack2' | 'closed'
export type AlertType = 'low' | 'high'

/** RESPONSE shape — snake_case (comes straight from Alert.to_dict()). */
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
  created_at: string
}

/** Dashboard summary — snake_case wire format. */
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
}

export type UserRole =
  | 'employee'
  | 'manager'
  | 'social_worker'
  | 'admin'
  | 'it_security'

/** RESPONSE shape — snake_case (comes straight from User.to_dict()). */
export interface User {
  user_id: string
  display_name: string
  role: UserRole
  department_id?: string | null
  is_active: boolean
  is_dev_mode?: boolean
}
