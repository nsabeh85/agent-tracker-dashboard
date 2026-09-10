import { useState, type FormEvent } from 'react'
import { isEmail, isTrackingToken, trackingMailto, trackingUrl } from '../lib/tracking'

type Props = {
  token: string | null | undefined
  title: string
  requesterName: string
}

export function CopyTrackingLink({ token, title, requesterName }: Props) {
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  const ready = isTrackingToken(token)
  const url = ready ? trackingUrl(window.location.origin, token) : ''

  async function copy() {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this tracking link', url)
    }
  }

  function send(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    const to = email.trim()
    if (!isEmail(to)) return
    window.location.href = trackingMailto({ to, title, url, requesterName })
    setSentTo(to)
  }

  return (
    <div className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-ink-900 dark:text-ink-50 text-sm font-bold">Share tracking link</h3>
        <p className="text-ink-400 text-xs">View only. No login.</p>
      </div>

      {ready ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={url}
              aria-label="Public tracking URL"
              className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 min-w-0 flex-1 rounded-xl border px-3 py-2 font-mono text-xs"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="bg-brand-600 hover:bg-brand-700 shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-white transition"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          <form onSubmit={send} className="space-y-2">
            <label className="block">
              <span className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
                Or email it to the requester
              </span>
              <span className="mt-1 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setSentTo(null)
                  }}
                  placeholder="requester@digitalrealty.com"
                  className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={!isEmail(email)}
                  className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-40"
                >
                  Open email draft
                </button>
              </span>
            </label>
            {sentTo ? (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Draft opened for {sentTo}. Send it from your mail app to deliver the link.
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <p className="text-ink-500 dark:text-ink-400 text-sm leading-relaxed">
          Tracking links are not available until the share-link database script has been applied.
        </p>
      )}
    </div>
  )
}
