import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Admin } from '../types/database'

export type AuthState = {
  session: Session | null
  admin: Admin | null
  admins: Admin[]
  loading: boolean
  configured: boolean
  isDlrUser: boolean
  reloadAdmins: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  session: null,
  admin: null,
  admins: [],
  loading: true,
  configured: false,
  isDlrUser: false,
  reloadAdmins: async () => undefined,
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}

export function isDigitalRealtyEmail(email: string | null | undefined): boolean {
  return /@digitalrealty\.com$/i.test(email?.trim() ?? '')
}

/** Only same-origin app paths. Rejects protocol-relative and off-site values. */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
