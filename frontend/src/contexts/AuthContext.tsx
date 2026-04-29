/**
 * Auth context.
 *
 * Holds:
 *   - access token (kept in memory + localStorage for reload survival)
 *   - refresh token (localStorage)
 *   - current user (from /auth/me)
 *
 * Storage trade-off:
 *   localStorage is XSS-vulnerable. We accept this for v0.3 to keep the
 *   pilot simple. Sprint 5+ should evaluate moving the refresh token to
 *   an httpOnly cookie, which requires backend session glue.
 *
 * Token refresh is handled lazily by the api client when a 401 is hit on
 * an authenticated endpoint (Sprint 4 task — for v0.3 the user re-logs in
 * after access token expiry, 15 min by default).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api } from '../lib/api'
import type { User } from '../types'

const ACCESS_KEY = 'wellbeing.accessToken'
const REFRESH_KEY = 'wellbeing.refreshToken'

interface AuthState {
  user: User | null
  accessToken: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string, refreshToken: string, user: User) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)


export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    loading: true,
  })

  /** Login: store tokens, fetch user profile. */
  const login = useCallback(
    (accessToken: string, refreshToken: string, user: User) => {
      localStorage.setItem(ACCESS_KEY, accessToken)
      localStorage.setItem(REFRESH_KEY, refreshToken)
      api.setAccessToken(accessToken)
      setState({ user, accessToken, loading: false })
    },
    [],
  )

  /** Logout: drop tokens, call backend best-effort. */
  const logout = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // Best-effort — even if the backend call fails, drop local state.
    }
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    api.setAccessToken(null)
    setState({ user: null, accessToken: null, loading: false })
  }, [])

  /** Refresh the user profile from /auth/me. */
  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.me()
      setState((s) => ({ ...s, user, loading: false }))
    } catch {
      // 401 means our token is no longer valid — log out cleanly.
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
      api.setAccessToken(null)
      setState({ user: null, accessToken: null, loading: false })
    }
  }, [])

  /** Bootstrap: rehydrate from localStorage, then verify with /auth/me.
   *  Even without a stored token, we attempt /me — if the backend is in
   *  DEV_MODE it will return the synthetic admin and skip the login screen. */
  useEffect(() => {
    const stored = localStorage.getItem(ACCESS_KEY)
    if (stored) {
      api.setAccessToken(stored)
      setState((s) => ({ ...s, accessToken: stored, loading: true }))
    }
    refreshUser()
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}
