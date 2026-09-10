import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/** Without credentials the app renders sample content instead of failing silently. */
export const isDemoMode = !isSupabaseConfigured

export const supabase = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-key',
)

/** True when PostgREST has not loaded the named RPC, so the client can fall back. */
export function isMissingFunctionError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === '42883') return true
  const message = error.message?.toLowerCase() ?? ''
  return message.includes('could not find the function')
}
