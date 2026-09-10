import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isDigitalRealtyEmail, safeReturnPath, useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { admin, configured, isDlrUser, session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!isDigitalRealtyEmail(normalizedEmail)) {
      setError('Use your @digitalrealty.com email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    setSaving(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    setPassword('')
    navigate(safeReturnPath((location.state as { from?: unknown } | null)?.from), { replace: true })
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
      return
    }
    setEmail('')
    setPassword('')
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h2 className="text-ink-900 dark:text-ink-50 text-2xl font-semibold tracking-tight">
        Sign in
      </h2>
      <p className="text-ink-500 dark:text-ink-400 text-sm">
        Digital Realty employees can view the tracker. Administrators can also edit it.
      </p>

      {!configured ? (
        <p className="border-ink-200 dark:border-ink-800 dark:bg-ink-900 rounded-2xl border bg-white p-5 text-sm text-ink-600 dark:text-ink-300">
          This tracker is not connected to a database, so sign-in is unavailable.
        </p>
      ) : session ? (
        <div className="border-ink-200 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-5 text-sm">
          <p>
            Signed in as <span className="font-semibold">{session.user.email}</span>
            {admin
              ? ` — administrator (${admin.display_name})`
              : isDlrUser
                ? ' — view only'
                : ' — this account is not authorized.'}
          </p>
          <div className="flex items-center gap-3">
            {isDlrUser ? (
              <Link to="/" className="text-brand-700 dark:text-brand-300 font-semibold">
                Open tracker
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-ink-500 dark:text-ink-400"
            >
              Sign out
            </button>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </div>
      ) : (
        <form
          onSubmit={(event) => void onSubmit(event)}
          className="border-ink-200 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-5"
        >
          <label className="text-ink-500 dark:text-ink-400 block text-xs font-medium">
            Work email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@digitalrealty.com"
              className="border-ink-200 dark:border-ink-800 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          <label className="text-ink-500 dark:text-ink-400 block text-xs font-medium">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-ink-200 dark:border-ink-800 mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="bg-brand-600 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-ink-400 text-xs leading-relaxed">
            Accounts are created by an administrator. Microsoft sign-in will replace passwords
            later.
          </p>
        </form>
      )}
    </div>
  )
}
