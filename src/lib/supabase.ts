import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { createAzureClient } from './azureClient'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const apiUrl = import.meta.env.VITE_API_URL

export const isAzureConfigured = Boolean(apiUrl)
export const isSupabaseConfigured = Boolean(url && anonKey)

/** Without credentials the app renders sample content instead of failing silently. */
export const isDemoMode = !isAzureConfigured && !isSupabaseConfigured

const azureClient = isAzureConfigured ? createAzureClient(apiUrl) : null
const supabaseClient = createClient<Database>(
  url || 'https://placeholder.supabase.co',
  anonKey || 'public-anon-key',
)

export const supabase = (azureClient ?? supabaseClient) as SupabaseClient<Database>

/** True when PostgREST has not loaded the named RPC, so the client can fall back. */
export function isMissingFunctionError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === '42883') return true
  const message = error.message?.toLowerCase() ?? ''
  return message.includes('could not find the function')
}
