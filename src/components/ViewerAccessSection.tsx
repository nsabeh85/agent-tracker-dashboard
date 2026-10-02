import type { AccountSummary } from '../lib/manageAccounts'
import { formatDateTime } from '../lib/schedule'

/**
 * Employees who can open the tracker but are not administrators.
 * Owners are a separate catalog of names on requests; they are not logins.
 */
export function ViewerAccessSection({
  accounts,
  adminEmails,
  busy,
  onAdd,
  onReset,
  onRemove,
}: {
  accounts: AccountSummary[]
  adminEmails: Set<string>
  busy: boolean
  onAdd: () => void
  onReset: (account: AccountSummary) => void
  onRemove: (account: AccountSummary) => void
}) {
  const viewers = accounts.filter((account) => !adminEmails.has(account.email.toLowerCase()))

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-ink-400 text-sm font-semibold tracking-wide uppercase">
            Viewer access
          </h3>
          <p className="text-ink-500 dark:text-ink-400 mt-1 text-xs">
            New users who should only view the board. They are not administrators and have no
            owner rights. Adding one creates their sign-in password.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onAdd}
          className="text-brand-700 dark:text-brand-300 text-sm font-semibold disabled:opacity-40"
        >
          Add viewer
        </button>
      </div>
      <ul className="divide-ink-100 border-ink-200 dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900 divide-y overflow-hidden rounded-2xl border bg-white">
        {viewers.map((account) => (
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
              onClick={() => onReset(account)}
              className="text-ink-500 dark:text-ink-400 text-xs disabled:opacity-40"
            >
              Reset password
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(account)}
              className="text-xs text-red-500 disabled:opacity-40 dark:text-red-400"
            >
              Remove
            </button>
          </li>
        ))}
        {viewers.length === 0 ? (
          <li className="text-ink-400 px-4 py-3 text-sm">No view-only accounts yet.</li>
        ) : null}
      </ul>
    </section>
  )
}
