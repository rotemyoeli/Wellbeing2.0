/**
 * API client.
 *
 * - Vite proxies /api/* to the Flask backend during dev (vite.config.ts).
 * - Access token (when present) is attached to every request as Bearer.
 * - DEV_MODE on the backend doesn't need a token; the client still works
 *   with no token set.
 */

import type { Alert, AlertStatus, DashboardSummary, User } from '../types'

export interface HealthResponse {
  status: string
  version: string
  dev_mode: boolean
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
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
  private baseUrl = '/api/v1'
  private accessToken: string | null = null

  setAccessToken(token: string | null): void {
    this.accessToken = token
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    }
    if (this.accessToken) {
      h.Authorization = `Bearer ${this.accessToken}`
    }
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
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`)
    }
    return response.json()
  }

  // ------------- Auth ----------------------------------------------------

  /** Request an OTP. Always returns success-shape (no leakage). */
  async requestOtp(contact: string, contactType: 'email' | 'phone' = 'email'): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/request-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ contact, contactType }),
    })
    if (response.status === 429) {
      throw new Error(await this.parseError(response))
    }
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
  }

  /** Verify an OTP and receive a JWT pair. */
  async verifyOtp(contact: string, code: string): Promise<VerifyOtpResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ contact, code }),
    })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  /** Server-side logout. Best-effort. */
  async logout(): Promise<void> {
    if (!this.accessToken) return
    await fetch(`${this.baseUrl}/auth/logout`, {
      method: 'POST',
      headers: this.headers(),
    })
  }

  /** Get the current user profile. */
  async me(): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.headers(),
    })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  // ------------- Check-ins -----------------------------------------------

  async submitCheckIn(payload: SubmitCheckInPayload): Promise<SubmitCheckInResponse> {
    const response = await fetch(`${this.baseUrl}/checkins/`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  async listMyCheckIns(): Promise<{ items: CheckInListItem[]; total: number }> {
    const response = await fetch(`${this.baseUrl}/checkins/me`, {
      headers: this.headers(),
    })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  // ------------- Dashboard ----------------------------------------------

  async dashboardSummary(periodDays = 7): Promise<DashboardSummary> {
    const response = await fetch(
      `${this.baseUrl}/dashboard/summary?period=${periodDays}`,
      { headers: this.headers() },
    )
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  // ------------- Alerts -------------------------------------------------

  async listAlerts(status?: AlertStatus): Promise<{ items: Alert[]; total: number }> {
    const url = status
      ? `${this.baseUrl}/alerts/?status=${status}`
      : `${this.baseUrl}/alerts/`
    const response = await fetch(url, { headers: this.headers() })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }

  async ackAlert(alertId: string, step: 1 | 2 | 3, note?: string): Promise<Alert> {
    const body: { step: number; note?: string } = { step }
    if (note !== undefined) body.note = note
    const response = await fetch(`${this.baseUrl}/alerts/${alertId}/ack`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(await this.parseError(response))
    }
    return response.json()
  }
}

export const api = new WellbeingApiClient()
