import { useState } from 'react'
import { isTrackingToken, trackingUrl } from '../lib/tracking'

type Props = {
  token: string | null | undefined
}

export function CopyTrackingLink({ token }: Props) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const ready = isTrackingToken(token)
  const url = ready ? trackingUrl(window.location.origin, token) : ''

  async function copy() {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setRevealed(true)
      window.prompt('Copy this tracking link', url)
    }
  }

  return (
    <div className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-ink-900 dark:text-ink-50 text-sm font-bold">Share tracking link</h3>
        <p className="text-ink-400 text-xs">View only. No login.</p>
      </div>

      {ready ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="bg-brand-600 hover:bg-brand-700 rounded-full px-4 py-2 text-sm font-semibold text-white transition"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              aria-expanded={revealed}
              onClick={() => setRevealed((open) => !open)}
              className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 rounded-full border px-4 py-2 text-sm font-semibold transition"
            >
              {revealed ? 'Hide link' : 'Show link'}
            </button>
          </div>
          {revealed ? (
            <input
              readOnly
              value={url}
              aria-label="Public tracking URL"
              className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 w-full rounded-xl border px-3 py-2 font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
          ) : null}
        </>
      ) : (
        <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">
          Tracking links are not available until the share-link database script has been applied.
        </p>
      )}
    </div>
  )
}
