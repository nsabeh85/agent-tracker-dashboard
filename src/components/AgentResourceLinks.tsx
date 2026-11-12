import { useState } from 'react'
import { isHttpsUrl } from '../lib/sourceLink'
import { supabase } from '../lib/supabase'
import type { Agent } from '../types/database'

const FIELDS = [
  { key: 'approval_package_url', label: 'Approval Package Link' },
  { key: 'confluence_url', label: 'Confluence' },
] as const

type FieldKey = (typeof FIELDS)[number]['key']

type Props = {
  agent: Agent
  canEdit: boolean
  onSaved: () => Promise<void>
}

export function AgentResourceLinks({ agent, canEdit, onSaved }: Props) {
  const [drafts, setDrafts] = useState<Record<FieldKey, string>>({
    approval_package_url: agent.approval_package_url ?? '',
    confluence_url: agent.confluence_url ?? '',
  })
  const [saving, setSaving] = useState<FieldKey | null>(null)
  const [editing, setEditing] = useState<FieldKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saved = {
    approval_package_url: agent.approval_package_url ?? '',
    confluence_url: agent.confluence_url ?? '',
  }
  const visible = FIELDS.filter((field) => canEdit || saved[field.key])
  if (visible.length === 0) return null

  async function save(key: FieldKey) {
    const url = drafts[key].trim()
    if (!isHttpsUrl(url)) {
      setError('Paste an https link.')
      return
    }
    setSaving(key)
    const { error: updateError } = await supabase
      .from('agents')
      .update(key === 'approval_package_url' ? { approval_package_url: url || null } : { confluence_url: url || null })
      .eq('id', agent.id)
    setSaving(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setError(null)
    setEditing(null)
    await onSaved()
  }

  function cancel(key: FieldKey) {
    setDrafts((current) => ({ ...current, [key]: saved[key] }))
    setEditing(null)
    setError(null)
  }

  return (
    <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
      {visible.map((field) => {
        const url = saved[field.key]
        const showEditor = canEdit && (!url || editing === field.key)
        return (
          <div key={field.key} className="space-y-3 not-first:border-ink-200/80 not-first:dark:border-ink-800 not-first:border-t not-first:pt-4">
            <h3 className="text-ink-900 dark:text-ink-50 text-sm font-bold">{field.label}</h3>
            {url && !showEditor ? (
              <div className="flex flex-wrap gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-brand-600 hover:bg-brand-700 rounded-full px-4 py-2 text-sm font-semibold text-white transition"
                >
                  Open
                </a>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setEditing(field.key)}
                    className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 rounded-full border px-4 py-2 text-sm font-semibold transition"
                  >
                    Change link
                  </button>
                ) : null}
              </div>
            ) : null}
            {showEditor ? (
              <div className="flex flex-wrap gap-2">
                <input
                  type="url"
                  aria-label={field.label}
                  value={drafts[field.key]}
                  placeholder="https://"
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                  className="border-ink-200 text-ink-800 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100 min-w-64 flex-1 rounded-xl border px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  disabled={saving === field.key}
                  onClick={() => void save(field.key)}
                  className="bg-brand-600 hover:bg-brand-700 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving === field.key ? 'Saving…' : 'Save'}
                </button>
                {url ? (
                  <button
                    type="button"
                    onClick={() => cancel(field.key)}
                    className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 rounded-full border px-4 py-2 text-sm font-semibold transition"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </section>
  )
}
