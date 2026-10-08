import { FunctionsHttpError } from '@supabase/supabase-js'
import { PostgrestClient } from '@supabase/postgrest-js'

const SESSION_KEY = 'agent-tracker-azure-session'
const TOKEN_TTL_SKEW_MS = 30_000

type AzureUser = { id: string; email: string }
type AzureSession = { access_token: string; expires_at: number; user: AzureUser }
type Listener = (event: string, session: AzureSession | null) => void

const listeners = new Set<Listener>()

function readSession(): AzureSession | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as AzureSession
    if (!session.access_token || !session.user?.email) return null
    if (session.expires_at <= Date.now() + TOKEN_TTL_SKEW_MS) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

function writeSession(session: AzureSession | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
  for (const listener of listeners) listener(session ? 'SIGNED_IN' : 'SIGNED_OUT', session)
}

export function createAzureClient(apiUrl: string) {
  const root = apiUrl.replace(/\/$/, '')
  const rest = new PostgrestClient(`${root}/rest/v1`, {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers)
      const session = readSession()
      if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
      return fetch(input, { ...init, headers })
    },
  })

  return {
    from: rest.from.bind(rest),
    rpc: rest.rpc.bind(rest),
    auth: {
      async getSession() {
        try {
          const me = await fetch('/.auth/me', { credentials: 'same-origin' })
          if (me.ok) {
            const body = (await me.json()) as { clientPrincipal?: { userDetails?: string } | null }
            const email = body.clientPrincipal?.userDetails?.trim().toLowerCase()
            if (email) {
              const exchanged = await fetch(`${root}/auth/session`, {
                method: 'POST',
                credentials: 'same-origin',
              })
              if (exchanged.ok) {
                const tokenBody = (await exchanged.json()) as {
                  access_token: string
                  expires_in: number
                  user: AzureUser
                }
                const session: AzureSession = {
                  access_token: tokenBody.access_token,
                  expires_at: Date.now() + tokenBody.expires_in * 1000,
                  user: tokenBody.user,
                }
                writeSession(session)
                return { data: { session } }
              }
            } else {
              writeSession(null)
              return { data: { session: null } }
            }
          }
        } catch {
          // Local preview has no Static Web Apps sign-in endpoint.
        }
        return { data: { session: readSession() } }
      },
      onAuthStateChange(callback: Listener) {
        listeners.add(callback)
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback)
              },
            },
          },
        }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        let response: Response
        try {
          response = await fetch(`${root}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          })
        } catch {
          return { data: { session: null, user: null }, error: { message: 'Could not reach sign-in.' } }
        }
        if (!response.ok) {
          return {
            data: { session: null, user: null },
            error: { message: 'Email or password is incorrect.' },
          }
        }
        const body = (await response.json()) as {
          access_token: string
          expires_in: number
          user: AzureUser
        }
        const session: AzureSession = {
          access_token: body.access_token,
          expires_at: Date.now() + body.expires_in * 1000,
          user: body.user,
        }
        writeSession(session)
        return { data: { session, user: body.user }, error: null }
      },
      async signOut() {
        writeSession(null)
        window.location.assign('/.auth/logout?post_logout_redirect_uri=/login')
        return { error: null }
      },
    },
    functions: {
      async invoke<T>(name: string, options?: { body?: unknown }) {
        if (name !== 'manage-accounts') {
          return { data: null, error: new Error('Unknown account action.') }
        }
        const session = readSession()
        let response: Response
        try {
          response = await fetch(`${root}/accounts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: session ? `Bearer ${session.access_token}` : '',
            },
            body: JSON.stringify(options?.body ?? {}),
          })
        } catch (error) {
          return { data: null, error }
        }
        if (!response.ok) {
          return { data: null, error: new FunctionsHttpError(response) }
        }
        return { data: (await response.json()) as T, error: null }
      },
    },
    channel(_name: string) {
      const handlers: Array<() => void> = []
      let timer: ReturnType<typeof setInterval> | undefined
      const subscription = {
        on(_event: string, _filter: unknown, callback: () => void) {
          handlers.push(callback)
          return subscription
        },
        subscribe() {
          timer = setInterval(() => {
            for (const handler of handlers) handler()
          }, 15000)
          return subscription
        },
      }
      return Object.assign(subscription, {
        remove() {
          if (timer) clearInterval(timer)
        },
      })
    },
    async removeChannel(subscription: { remove?: () => void }) {
      subscription.remove?.()
      return 'ok' as const
    },
  }
}
