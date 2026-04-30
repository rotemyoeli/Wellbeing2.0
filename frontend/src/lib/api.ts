/**
 * API client — all backend communication goes through here.
 */

import type { Alert, AlertStatus, ConsentStatus, DashboardSummary, TeamUpdate, User } from '../types'

export interface HealthResponse {
  status: string
  version: string
  dev_mode: boolean
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown }
}

export interface SubmitCheckInPayload {
  energy: number
  anonMode: boolean
  supportQ?: boolean | null
  workloadQ?: boolean | null
  comment?: string | null
  shiftId?: string | null
}

export interface SubmitCheckInResponse {
  checkInId: string
  timestamp: string
  alertCreated?: boolean
  alertType?: 'low' | 'high'
}

export interface CheckInListItem {
  check_in_id: string
  energy: number
  support_q: boolean | null
  workload_q: boolean | null
  is_anonymous: boolean
  source: string
  created_at: string
  user_id?: string
}

export interface VerifyOtpResponse {
  accessToken: string
  refreshToken: string
  user: User
}

class WellbeingApiClient {
  private baseUrl = (import.meta.env.VITE_API_URL || '') + '/api/v1'
  private accessToken: string | null = null

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
    if (this.accessToken) h.Authorization = `Bearer ${this.accessToken}`
    return h
  }

  private async parseError(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as ApiError
      return body?.error?.message ?? `Request failed: ${response.status}`
    } catch {
      return `Request failed: ${response.status}`
    }
  }

  // ------------- Health ---------------------------------------------------
  async health(): Promise<HealthResponse> {
    const r = await fetch(`${this.baseUrl}/health`)
    if (!r.ok) throw new Error(`Health check failed: ${r.status}`)
    return r.json()
  }

  // ------------- Auth ----------------------------------------------------
  async requestOtp(contact: string, contactType: 'email' | 'phone' = 'email'): Promise<void> {
    const r = await fetch(`${this.baseUrl}/auth/request-otp`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ contact, contactType }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
  }

  async verifyOtp(contact: string, code: string): Promise<VerifyOtpResponse> {
    const r = await fetch(`${this.baseUrl}/auth/verify-otp`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ contact, code }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async demoLogin(userId: string): Promise<VerifyOtpResponse> {
    const r = await fetch(`${this.baseUrl}/auth/demo-login`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ userId }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async logout(): Promise<void> {
    if (!this.accessToken) return
    await fetch(`${this.baseUrl}/auth/logout`, { method: 'POST', headers: this.headers() })
  }

  async me(): Promise<{ user: User }> {
    const r = await fetch(`${this.baseUrl}/auth/me`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  // ------------- Users ---------------------------------------------------
  async updateProfile(data: { displayName?: string; role?: string; departmentId?: string | null }): Promise<{ user: User }> {
    const r = await fetch(`${this.baseUrl}/users/me`, {
      method: 'PATCH', headers: this.headers(),
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  // ------------- Consent -------------------------------------------------
  async consentStatus(): Promise<ConsentStatus> {
    const r = await fetch(`${this.baseUrl}/consent/status`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async acceptConsent(): Promise<void> {
    const r = await fetch(`${this.baseUrl}/consent/accept`, {
      method: 'POST', headers: this.headers(),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
  }

  // ------------- Check-ins -----------------------------------------------
  async submitCheckIn(payload: SubmitCheckInPayload): Promise<SubmitCheckInResponse> {
    const r = await fetch(`${this.baseUrl}/checkins/`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async updateFollowUp(checkInId: string, data: { supportQ?: boolean | null; workloadQ?: boolean | null }): Promise<void> {
    const r = await fetch(`${this.baseUrl}/checkins/${checkInId}/follow-up`, {
      method: 'PATCH', headers: this.headers(),
      body: JSON.stringify(data),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
  }

  async updateComment(checkInId: string, comment: string | null): Promise<void> {
    const r = await fetch(`${this.baseUrl}/checkins/${checkInId}/comment`, {
      method: 'PATCH', headers: this.headers(),
      body: JSON.stringify({ comment }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
  }

  async listMyCheckIns(): Promise<{ items: CheckInListItem[]; total: number }> {
    const r = await fetch(`${this.baseUrl}/checkins/me`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  // ------------- Dashboard -----------------------------------------------
  async dashboardSummary(periodDays = 7, departmentId?: string): Promise<DashboardSummary> {
    let url = `${this.baseUrl}/dashboard/summary?period=${periodDays}`
    if (departmentId) url += `&departmentId=${encodeURIComponent(departmentId)}`
    const r = await fetch(url, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  // ------------- Alerts --------------------------------------------------
  async getAlert(alertId: string): Promise<Alert> {
    const r = await fetch(`${this.baseUrl}/alerts/${alertId}`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async listAlerts(status?: AlertStatus): Promise<{ items: Alert[]; total: number }> {
    const url = status ? `${this.baseUrl}/alerts/?status=${status}` : `${this.baseUrl}/alerts/`
    const r = await fetch(url, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async ackAlert(alertId: string, step: 1 | 2 | 3, note?: string, publishToTeam?: boolean, departmentId?: string): Promise<Alert> {
    const body: Record<string, unknown> = { step }
    if (note !== undefined) body.note = note
    if (publishToTeam !== undefined) body.publishToTeam = publishToTeam
    if (departmentId !== undefined) body.departmentId = departmentId
    const r = await fetch(`${this.baseUrl}/alerts/${alertId}/ack`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async unpublishedClosures(days = 14): Promise<{ unpublished: Alert[]; published: Alert[]; days: number }> {
    const r = await fetch(`${this.baseUrl}/alerts/unpublished-closures?days=${days}`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async publishClosure(alertId: string, departmentId: string, content?: string): Promise<Alert> {
    const r = await fetch(`${this.baseUrl}/alerts/${alertId}/publish`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ departmentId, content }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  // ------------- Team Updates --------------------------------------------
  async listTeamUpdates(departmentId: string, limit = 20): Promise<{ items: TeamUpdate[]; total: number }> {
    const r = await fetch(`${this.baseUrl}/team-updates/?departmentId=${departmentId}&limit=${limit}`, { headers: this.headers() })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async createTeamUpdate(departmentId: string, content: string, publish = true): Promise<TeamUpdate> {
    const r = await fetch(`${this.baseUrl}/team-updates/`, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify({ departmentId, content, publish }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async editTeamUpdate(updateId: string, content: string): Promise<TeamUpdate> {
    const r = await fetch(`${this.baseUrl}/team-updates/${updateId}`, {
      method: 'PUT', headers: this.headers(),
      body: JSON.stringify({ content }),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
    return r.json()
  }

  async deleteTeamUpdate(updateId: string): Promise<void> {
    const r = await fetch(`${this.baseUrl}/team-updates/${updateId}`, {
      method: 'DELETE', headers: this.headers(),
    })
    if (!r.ok) throw new Error(await this.parseError(r))
  }
}

export const api = new WellbeingApiClient()
