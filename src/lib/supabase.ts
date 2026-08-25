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
