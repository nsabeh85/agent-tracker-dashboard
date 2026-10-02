import { useState } from 'react'
import type { AccountCredential } from '../lib/accountsClient'

type Props =
  | { kind: 'password'; credential: AccountCredential; onDismiss: () => void }
  | { kind: 'message'; tone: 'error' | 'info'; message: string; onDismiss: () => void }

/**
 * Centered pop-up so the result of a sign-in action is visible wherever the
 * page is scrolled. A password is shown once and cleared on dismiss.
 */
export function TemporaryPassword(props: Props) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  async function copyPassword() {
    if (props.kind !== 'password') return
    try {
      await navigator.clipboard.writeText(props.credential.temporary_password)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopyError('Copy failed. Select the password and copy it manually.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="dark:bg-ink-900 w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        {props.kind === 'password' ? (
          <>
            <p className="text-ink-900 dark:text-ink-50 text-base font-semibold">
              Password for {props.credential.email}
            </p>
            <p className="text-ink-600 dark:text-ink-300 text-sm">
              This works for sign-in now and is shown once. Copy it before closing. Give it to
              them directly, not by email or Jira, and not in the same message as the link.
            </p>
            <code className="text-ink-900 dark:text-ink-50 bg-ink-100 dark:bg-ink-800 block rounded-lg px-3 py-3 text-center font-mono text-lg tracking-wider select-all">
              {props.credential.temporary_password}
            </code>
            {copyError ? (
              <p className="text-xs text-red-600 dark:text-red-400">{copyError}</p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => void copyPassword()}
                className="bg-brand-600 rounded-full px-4 py-2 text-sm font-semibold text-white"
              >
                {copied ? 'Copied' : 'Copy password'}
              </button>
              <button
                type="button"
                onClick={props.onDismiss}
                className="text-ink-500 dark:text-ink-400 text-sm font-semibold"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p
              className={
                props.tone === 'error'
                  ? 'text-sm text-red-600 dark:text-red-400'
                  : 'text-ink-700 dark:text-ink-200 text-sm'
              }
            >
              {props.message}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={props.onDismiss}
                className="text-ink-500 dark:text-ink-400 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
