import { useCallback, useEffect, useState } from 'react'
import {
  createAccount,
  listAccounts,
  removeAccount,
  resetAccountPassword,
  type AccountCredential,
} from '../lib/accountsClient'
import { isDigitalRealtyEmail, useAuth } from '../lib/auth'
import { formatDateTime } from '../lib/schedule'
import type { AccountSummary } from '../lib/manageAccounts'

/**
 * Admin-only list of who can sign in. Creating or resetting shows the
 * temporary password exactly once; it is never stored client-side beyond
 * this component's state and is cleared on dismiss.
 */
export function AccountsSection() {
  const { admin } = useAuth()
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credential, setCredential] = useState<AccountCredential | null>(null)
  const [copied, setCopied] = useState(false)

  const reload = useCallback(async () => {
    try {
      setAccounts(await listAccounts())
      setError(null)
    } catch (loadError) {
      setError((loadError as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await task()
    } catch (taskError) {
      setError((taskError as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function addAccount() {
    const email = window.prompt('Work email for the new account (@digitalrealty.com)')
    if (!email?.trim()) return
    const normalized = email.trim().toLowerCase()
    if (!isDigitalRealtyEmail(normalized)) {
      setError('Accounts must use an @digitalrealty.com email address.')
      return
    }
    void run(async () => {
      setCopied(false)
      setCredential(await createAccount(normalized))
      await reload()
    })
  }

  function resetPassword(account: AccountSummary) {
    if (
      !window.confirm(
        `Reset the password for ${account.email}? Their current password stops working immediately.`,
      )
    ) {
      return
    }
    void run(async () => {
      setCopied(false)
      setCredential(await resetAccountPassword(account.email))
    })
  }

  function remove(account: AccountSummary) {
    if (
      !window.confirm(
        `Remove the sign-in account for ${account.email}? They will no longer be able to open the tracker.`,
      )
    ) {
      return
    }
    void run(async () => {
      await removeAccount(account.email)
      await reload()
    })
  }

  async function copyPassword() {
    if (!credential) return
    try {
      await navigator.clipboard.writeText(credential.temporary_password)
      setCopied(true)
    } catch {
      setError('Copy failed. Select the password and copy it manually.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-ink-400 text-sm font-semibold tracking-wide uppercase">
            Sign-in accounts
          </h3>
          <p className="text-ink-500 dark:text-ink-400 mt-1 text-xs">
            Anyone listed here can sign in and view the tracker. Add them to Administrators
            above if they should also edit it.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={addAccount}
          className="text-brand-700 dark:text-brand-300 text-sm font-semibold disabled:opacity-40"
        >
          Add account
        </button>
      </div>

      {credential ? (
        <div
          role="status"
          className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/40 dark:bg-amber-500/10"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            Temporary password for {credential.email}
          </p>
          <p className="text-amber-900/80 dark:text-amber-100/80">
            This is shown once. Give it to them directly (call or a chat message you delete
            afterwards), not by email or a Jira comment, and not in the same message as the
            tracker link. Ask them to request a reset if they want a different one.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-lg bg-white px-3 py-2 font-mono text-base tracking-wider text-ink-900 select-all dark:bg-ink-900 dark:text-ink-50">
              {credential.temporary_password}
            </code>
            <button
              type="button"
              onClick={() => void copyPassword()}
              className="rounded-full border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 dark:bg-ink-900 dark:text-amber-200"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCredential(null)
                setCopied(false)
              }}
              className="text-xs font-semibold text-amber-900/70 dark:text-amber-200/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {loading ? (
        <p className="text-ink-400 text-sm">Loading accounts…</p>
      ) : (
        <ul className="divide-ink-100 border-ink-200 dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900 divide-y overflow-hidden rounded-2xl border bg-white">
          {accounts.map((account) => {
            const isSelf = account.email.toLowerCase() === admin?.email.toLowerCase()
            return (
              <li key={account.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="text-ink-900 dark:text-ink-50 block truncate text-sm font-medium">
                    {account.email}
                  </span>
                  <span className="text-ink-400 block text-xs">
                    {account.last_sign_in_at
                      ? `Last sign-in ${formatDateTime(account.last_sign_in_at)}`
                      : 'Has not signed in yet'}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => resetPassword(account)}
                  className="text-ink-500 dark:text-ink-400 text-xs disabled:opacity-40"
                >
                  Reset password
                </button>
                <button
                  type="button"
                  disabled={busy || isSelf}
                  onClick={() => remove(account)}
                  className="text-xs text-red-500 disabled:cursor-not-allowed disabled:opacity-35 dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            )
          })}
          {accounts.length === 0 ? (
            <li className="text-ink-400 px-4 py-3 text-sm">No accounts yet.</li>
          ) : null}
        </ul>
      )}
    </section>
  )
}
