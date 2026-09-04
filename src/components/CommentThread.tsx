import { useState, type FormEvent } from 'react'
import { formatDateTime, initials } from '../lib/schedule'
import { supabase } from '../lib/supabase'
import type { AgentStage, Comment, Stage } from '../types/database'

const COMMENT_NAME_KEY = 'agent-tracker-comment-name'
const COMMENT_EMAIL_KEY = 'agent-tracker-comment-email'

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be blocked.
  }
}

type Props = {
  agentId: string
  rows: Array<AgentStage & { stage: Stage }>
  comments: Comment[]
  onSaved: () => Promise<void>
  /** Public tracker: larger composer, name-only, no email collection. */
  variant?: 'internal' | 'public'
}

export function CommentThread({
  agentId,
  rows,
  comments,
  onSaved,
  variant = 'internal',
}: Props) {
  const isPublic = variant === 'public'
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState(() => readStored(COMMENT_NAME_KEY))
  const [authorEmail, setAuthorEmail] = useState(() => readStored(COMMENT_EMAIL_KEY))
  const [stageId, setStageId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const name = authorName.trim()
    if (!name || !body.trim()) return
    writeStored(COMMENT_NAME_KEY, name)
    if (!isPublic) writeStored(COMMENT_EMAIL_KEY, authorEmail.trim())
    setSaving(true)
    const { error } = await supabase.from('comments').insert({
      agent_id: agentId,
      agent_stage_id: isPublic ? null : stageId || null,
      author_email: isPublic ? 'public-tracker' : authorEmail.trim() || 'anonymous',
      author_name: name,
      body: body.trim(),
    })
    setSaving(false)
    if (error) window.alert(error.message)
    else {
      setBody('')
      setStageId('')
      await onSaved()
    }
  }

  const stageName = (id: string | null) => rows.find((r) => r.id === id)?.stage.name

  return (
    <section className="space-y-3">
      <h3 className="text-ink-400 px-1 text-xs font-bold tracking-[0.12em] uppercase">
        {isPublic ? 'Updates & questions' : 'Comments'}
      </h3>
      {isPublic ? (
        <p className="text-ink-500 dark:text-ink-400 px-1 text-sm leading-relaxed">
          Post a question or note for the team. Nobody is emailed when you write here —
          check back on this page for replies.
        </p>
      ) : null}

      <form
        onSubmit={(e) => void submit(e)}
        className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-4 shadow-sm md:p-6"
      >
        {isPublic ? (
          <input
            type="text"
            required
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your name"
            className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-xl border px-3 py-2 text-sm outline-none"
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your name"
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            />
            <input
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="Email (optional)"
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-xl border px-3 py-2 text-sm outline-none"
            />
          </div>
        )}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={isPublic ? 8 : 3}
          placeholder={
            isPublic
              ? 'Ask a question or share context. The team replies on this same thread…'
              : 'Post an update for everyone watching this agent…'
          }
          className="border-ink-200 focus:border-brand-500 focus:ring-brand-100 dark:border-ink-700 dark:text-ink-100 dark:focus:ring-brand-500/20 w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-4"
        />
        <div className="flex flex-wrap items-center gap-2">
          {isPublic ? null : (
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="border-ink-200 text-ink-700 dark:border-ink-700 dark:text-ink-200 rounded-full border px-3 py-1.5 text-sm"
            >
              <option value="">No stage tag</option>
              {rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.stage.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={saving || !body.trim() || !authorName.trim()}
            className="bg-ink-900 hover:bg-ink-800 dark:bg-brand-600 dark:hover:bg-brand-500 ml-auto rounded-full px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {saving ? 'Posting…' : isPublic ? 'Post to this request' : 'Post update'}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-900 flex gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm md:px-5 md:py-4"
          >
            <span className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {initials(comment.author_name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="text-ink-900 dark:text-ink-50 font-bold">
                  {comment.author_name}
                </span>
                <span className="text-ink-400 text-xs">
                  {formatDateTime(comment.created_at)}
                </span>
                {comment.agent_stage_id ? (
                  <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {stageName(comment.agent_stage_id)}
                  </span>
                ) : null}
              </div>
              <p className="text-ink-700 dark:text-ink-300 mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          </li>
        ))}
        {comments.length === 0 ? (
          <li className="text-ink-400 px-1 text-sm">No comments yet.</li>
        ) : null}
      </ul>
    </section>
  )
}
