import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Admin } from '../types/database'

export type AuthState = {
  session: Session | null
  admin: Admin | null
  loading: boolean
  configured: boolean
}

export const AuthContext = createContext<AuthState>({
  session: null,
  admin: null,
  loading: true,
  configured: false,
})

export function useAuth(): AuthState {
  return useContext(AuthContext)
}
