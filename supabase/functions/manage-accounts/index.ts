import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  generateTemporaryPassword,
  parseAccountRequest,
  type AccountSummary,
} from '../_shared/manageAccounts.ts'

// Admin-only account management for the password stopgap. The caller's own
// Supabase session must pass public.is_admin(); only then does the service
// role touch auth.users. The service-role key never leaves this function.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json(500, { error: 'server_misconfigured' })
  }

  const authorization = req.headers.get('Authorization') ?? ''
  if (!authorization.startsWith('Bearer ')) {
    return json(401, { error: 'unauthorized' })
  }

  // Runs as the caller, so RLS and is_admin() see their JWT.
  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: isAdmin, error: adminError } = await caller.rpc('is_admin')
  if (adminError || isAdmin !== true) {
    return json(403, { error: 'forbidden' })
  }
  const { data: callerUser } = await caller.auth.getUser()
  const callerEmail = callerUser?.user?.email?.toLowerCase() ?? ''

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }
  const parsed = parseAccountRequest(payload)
  if (!parsed.ok) {
    return json(422, { error: parsed.reason })
  }
  const request = parsed.value

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  async function findUserByEmail(email: string) {
    // listUsers has no email filter; the project is small enough to page.
    let page = 1
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw error
      const match = data.users.find((user) => user.email?.toLowerCase() === email)
      if (match) return match
      if (data.users.length < 200) return null
      page += 1
    }
  }

  try {
    if (request.action === 'list') {
      const accounts: AccountSummary[] = []
      let page = 1
      for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
        if (error) throw error
        for (const user of data.users) {
          if (!user.email) continue
          accounts.push({
            id: user.id,
            email: user.email,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at ?? null,
          })
        }
        if (data.users.length < 200) break
        page += 1
      }
      accounts.sort((a, b) => a.email.localeCompare(b.email))
      return json(200, { accounts })
    }

    if (request.action === 'create') {
      const existing = await findUserByEmail(request.email)
      if (existing) {
        return json(409, { error: 'already_exists' })
      }
      const temporaryPassword = generateTemporaryPassword()
      const { data, error } = await admin.auth.admin.createUser({
        email: request.email,
        password: temporaryPassword,
        email_confirm: true,
      })
      if (error) throw error
      return json(200, {
        email: data.user.email,
        temporary_password: temporaryPassword,
      })
    }

    if (request.action === 'reset_password') {
      const existing = await findUserByEmail(request.email)
      if (!existing) {
        return json(404, { error: 'not_found' })
      }
      const temporaryPassword = generateTemporaryPassword()
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password: temporaryPassword,
      })
      if (error) throw error
      return json(200, {
        email: existing.email,
        temporary_password: temporaryPassword,
      })
    }

    if (request.action === 'remove') {
      if (request.email === callerEmail) {
        return json(422, { error: 'cannot_remove_self' })
      }
      const existing = await findUserByEmail(request.email)
      if (!existing) {
        return json(404, { error: 'not_found' })
      }
      const { error } = await admin.auth.admin.deleteUser(existing.id)
      if (error) throw error
      return json(200, { email: existing.email, removed: true })
    }

    return json(422, { error: 'invalid_action' })
  } catch (error) {
    console.error('manage-accounts failed', (error as Error).message)
    return json(500, { error: 'account_action_failed' })
  }
})
