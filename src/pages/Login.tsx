import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function LoginPage() {
  const { admin, session } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    setSaving(false)
    if (otpError) setError(otpError.message)
    else setSent(true)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <p className="text-sm">
        <Link to="/" className="text-ink-400 hover:text-ink-700">
          Back to tracker
        </Link>
      </p>
      <h2 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-ink-50">Admin sign in</h2>
      <p className="text-sm text-ink-500 dark:text-ink-400">
        Magic link email is limited to the allowlist (Nabih and Mark). Everyone else can read
        the dashboard without signing in.
      </p>
      {session ? (
        <div className="space-y-3 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-sm">
          <p>
            Signed in as <span className="font-semibold">{session.user.email}</span>
            {admin ? ` (${admin.display_name})` : ' — this email is not on the admin allowlist.'}
          </p>
          <button type="button" onClick={() => void signOut()} className="text-brand-700 dark:text-brand-300">
            Sign out
          </button>
        </div>
      ) : sent ? (
        <p className="rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5 text-sm text-ink-600 dark:text-ink-300">
          Check your inbox for a sign-in link.
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-3 rounded-2xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 p-5">
          <label className="block text-xs font-medium text-ink-500 dark:text-ink-400">
            Work email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-ink-200 dark:border-ink-800 px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Send magic link
          </button>
        </form>
      )}
    </div>
  )
}
