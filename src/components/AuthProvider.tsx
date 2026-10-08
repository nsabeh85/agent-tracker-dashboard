import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext, isDigitalRealtyEmail } from '../lib/auth'
import { isAzureConfigured, isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Admin } from '../types/database'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [admins, setAdmins] = useState<Admin[]>([])
  const configured = isAzureConfigured || isSupabaseConfigured
  const [loading, setLoading] = useState(configured)

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
    if (!configured) return
    let mounted = true

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return
        setSession(data.session)
        try {
          await loadAccess(data.session)
        } catch {
          if (!mounted) return
          setAdmin(null)
          setAdmins([])
        } finally {
          if (mounted) setLoading(false)
        }
      })
      .catch(() => {
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
  }, [configured, loadAccess])

  return (
    <AuthContext.Provider
      value={{
        session,
        admin,
        admins,
        loading,
        configured,
        isDlrUser: isDigitalRealtyEmail(session?.user.email),
        reloadAdmins,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
