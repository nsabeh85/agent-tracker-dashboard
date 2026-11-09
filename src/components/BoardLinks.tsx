import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { isHttpsUrl } from '../lib/sourceLink'
import { isDemoMode, supabase } from '../lib/supabase'

const LINKS = [
  { key: 'approval_package', label: 'Approval Package Link' },
  { key: 'confluence', label: 'Confluence' },
] as const

type LinkKey = (typeof LINKS)[number]['key']

export function BoardLinks() {
  const { admin } = useAuth()
  const [saved, setSaved] = useState<Record<LinkKey, string>>({
    approval_package: '',
    confluence: '',
  })
  const [drafts, setDrafts] = useState<Record<LinkKey, string>>({
    approval_package: '',
    confluence: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<LinkKey | null>(null)

  useEffect(() => {
    if (isDemoMode) return
    let cancelled = false
    void supabase
      .from('board_links')
      .select('link_key, url')
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          setError(queryError.message)
          return
        }
        const next = { approval_package: '', confluence: '' }
        for (const row of data ?? []) {
          if (row.link_key === 'approval_package' || row.link_key === 'confluence') {
            next[row.link_key] = row.url
          }
        }
        setSaved(next)
        setDrafts(next)
        setError(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save(key: LinkKey) {
    const url = drafts[key].trim()
    if (!isHttpsUrl(url)) {
      setError('Paste an https link.')
      return
    }
    setSaving(key)
    if (isDemoMode) {
      setSaved((current) => ({ ...current, [key]: url }))
      setSaving(null)
      setError(null)
      return
    }
    const { error: updateError } = await supabase
      .from('board_links')
      .update({ url })
      .eq('link_key', key)
    setSaving(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setSaved((current) => ({ ...current, [key]: url }))
    setError(null)
  }

  return (
    <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white px-4 py-3">
      {LINKS.map((link) => (
        <div key={link.key} className="flex flex-wrap items-center gap-2">
          {saved[link.key] ? (
            <a
              href={saved[link.key]}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 dark:text-brand-300 text-sm font-semibold underline"
            >
              {link.label}
            </a>
          ) : (
            <span className="text-ink-800 dark:text-ink-100 text-sm font-semibold">{link.label}</span>
          )}
          {admin ? (
            <>
              <input
                type="url"
                aria-label={link.label}
                value={drafts[link.key]}
                placeholder="https://"
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [link.key]: event.target.value }))
                }
                className="border-ink-200 text-ink-800 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 min-w-64 flex-1 rounded-lg border px-2 py-1.5 text-sm outline-none"
              />
              <button
                type="button"
                disabled={saving === link.key}
                onClick={() => void save(link.key)}
                className="bg-brand-600 hover:bg-brand-700 rounded-full px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving === link.key ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : null}
        </div>
      ))}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  )
}
