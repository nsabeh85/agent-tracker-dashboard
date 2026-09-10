import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, isDigitalRealtyEmail } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Admin } from '../types/database'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadAccess = useCallback(async (nextSession: Session | null) => {
    const email = nextSession?.user.email
    if (!isDigitalRealtyEmail(email)) {
      setAdmin(null)
      setAdmins([])
      return
    }
    const { data, error } = await supabase
      .from('admins')
      .select('email, display_name')
      .order('display_name')
    if (error || !data) {
      setAdmin(null)
      setAdmins([])
      return
    }
    setAdmins(data)
    setAdmin(data.find((entry) => entry.email.toLowerCase() === email?.toLowerCase()) ?? null)
  }, [])

  const reloadAdmins = useCallback(async () => {
    await loadAccess(session)
  }, [loadAccess, session])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let mounted = true

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadAccess(data.session)
      if (mounted) setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadAccess(nextSession)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadAccess])

  return (
    <AuthContext.Provider
      value={{
        session,
        admin,
        admins,
        loading,
        configured: isSupabaseConfigured,
        isDlrUser: isDigitalRealtyEmail(session?.user.email),
        reloadAdmins,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
