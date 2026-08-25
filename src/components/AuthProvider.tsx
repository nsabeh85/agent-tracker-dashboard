import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AuthContext } from '../lib/auth'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Admin } from '../types/database'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  const resolveAdmin = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user.email) {
      setAdmin(null)
      return
    }
    const { data } = await supabase
      .from('admins')
      .select('email, display_name')
      .eq('email', nextSession.user.email)
      .maybeSingle()
    setAdmin(data)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      void resolveAdmin(data.session).finally(() => {
        if (mounted) setLoading(false)
      })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void resolveAdmin(next)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [resolveAdmin])

  return (
    <AuthContext.Provider
      value={{ session, admin, loading, configured: isSupabaseConfigured }}
    >
      {children}
    </AuthContext.Provider>
  )
}
