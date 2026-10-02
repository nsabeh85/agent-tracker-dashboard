import { useState } from 'react'
import type { AccountCredential } from '../lib/accountsClient'

/** Shown once. Cleared when dismissed; the password is not written anywhere else. */
export function TemporaryPassword({
  credential,
  onDismiss,
}: {
  credential: AccountCredential
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(credential.temporary_password)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopyError('Copy failed. Select the password and copy it manually.')
    }
  }

  return (
    <div
      role="status"
      className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <p className="font-semibold text-amber-900 dark:text-amber-200">
        Password for {credential.email}
      </p>
      <p className="text-amber-900/80 dark:text-amber-100/80">
        This works for sign-in right now, and it is shown once. Hand it over directly, not by
        email or in a Jira comment, and not in the same message as the tracker link.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="text-ink-900 dark:text-ink-50 rounded-lg bg-white px-3 py-2 font-mono text-base tracking-wider select-all dark:bg-ink-900">
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
          onClick={onDismiss}
          className="text-xs font-semibold text-amber-900/70 dark:text-amber-200/70"
        >
          Dismiss
        </button>
      </div>
      {copyError ? <p className="text-xs text-red-600 dark:text-red-400">{copyError}</p> : null}
    </div>
  )
}
