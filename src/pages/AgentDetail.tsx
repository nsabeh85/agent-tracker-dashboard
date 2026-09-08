import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { ScheduleMarker } from '../components/ScheduleMarker'
import { CheckIcon } from '../components/StageIcon'
import {
  orderedAgentStages,
  useAgentDetail,
  useCatalog,
  useRealtimeTick,
} from '../hooks/useTracker'
import {
  dueLabel,
  formatDate,
  formatDateTime,
  initials,
  isLiveAgent,
  isStageBehind,
  statusLabel,
  todayISO,
} from '../lib/schedule'
import { copilotStudioLabel, isHttpsUrl } from '../lib/copilotStudioLink'
import { supabase } from '../lib/supabase'
import type {
  Agent,
  AgentPriority,
  AgentStage,
  AgentStatus,
  AgentSubstep,
  Comment,
  ProgressStatus,
  Stage,
} from '../types/database'

const STATUS_PILL: Record<ProgressStatus, string> = {
  not_started: 'bg-ink-100 text-ink-500 ring-ink-200 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700',
  in_progress:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
  complete:
    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  blocked:
    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
}

export function AgentDetailPage() {
  const { id } = useParams()
  const tick = useRealtimeTick()
  const { stages } = useCatalog(tick)
  const { agent, substeps, comments, loading, error, reload } = useAgentDetail(id, tick)
  const [openStageId, setOpenStageId] = useState<string | null>(null)
  const [stageToggleReady, setStageToggleReady] = useState(false)

  const rows = useMemo(
    () => (agent ? orderedAgentStages(agent.agent_stages, stages) : []),
    [agent, stages],
  )

  useEffect(() => {
    if (stageToggleReady || !agent) return
    const currentRow = agent.agent_stages.find((s) => s.stage_id === agent.current_stage_id)
    setOpenStageId(currentRow?.id ?? null)
    setStageToggleReady(true)
  }, [agent, stageToggleReady])

  if (loading) return <div className="skeleton h-72 rounded-3xl" />
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!agent) return <p className="text-ink-500 text-sm">Agent not found.</p>

  const current = stages.find((s) => s.id === agent.current_stage_id)

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="text-ink-400 hover:text-brand-700 dark:hover:text-brand-300 inline-flex items-center gap-1.5 text-sm font-medium transition"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.5 3 4.5 8l5 5"
          />
        </svg>
        All agents
      </Link>

      <header className="from-brand-700 via-brand-600 to-brand-800 shadow-brand-900/20 dark:from-brand-900 dark:via-brand-800 dark:to-ink-900 dark:ring-brand-500/20 relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 shadow-xl md:p-8 dark:shadow-black/40 dark:ring-1">
        <div className="pointer-events-none absolute -top-20 -right-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-4xl">
              {agent.title}
            </h2>
            <ScheduleMarker
              agent={agent}
              agentStages={agent.agent_stages}
              stages={stages}
              withLabel
            />
          </div>

          {agent.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-white/75">{agent.description}</p>
          ) : null}
          {agent.copilot_studio_url ? (
            <a
              href={agent.copilot_studio_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Open in Copilot Studio ({copilotStudioLabel(agent.copilot_studio_url)})
            </a>
          ) : null}

          <div className="flex flex-wrap gap-2 text-xs">
            <Chip label="Requester" value={agent.requester_name} />
            <Chip label="Department" value={agent.requester_department} />
            <Chip label="Priority" value={agent.priority} />
            <Chip label="Owner" value={agent.assigned_to} />
            <Chip label="Stage" value={current?.name ?? '—'} />
            <Chip label="Status" value={statusLabel(agent.status)} />
          </div>
        </div>
      </header>

      <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 rounded-3xl border bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-ink-900 dark:text-ink-50 text-sm font-bold tracking-wide uppercase">
            Progress
          </h3>
          <p className="text-ink-500 dark:text-ink-400 text-sm">
            Target {formatDate(agent.target_go_live)}
            <span className="text-ink-300 mx-2">·</span>
            <span
              className={`font-semibold ${isLiveAgent(agent, stages) ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
            >
              {isLiveAgent(agent, stages) ? 'Live now' : dueLabel(agent.target_go_live)}
            </span>
          </p>
        </div>
        <ProgressBar
          stages={stages}
          currentStageId={agent.current_stage_id}
          agentStatus={agent.status}
          size="lg"
        />
      </section>

      <AgentActions agent={agent} rows={rows} onSaved={reload} />

      <section className="space-y-3">
        <h3 className="text-ink-400 px-1 text-xs font-bold tracking-[0.12em] uppercase">
          Stage breakdown
        </h3>
        {rows.map((row, index) => (
          <StageCard
            key={row.id}
            row={row}
            position={index + 1}
            substeps={substeps.filter((s) => s.agent_stage_id === row.id)}
            open={openStageId === row.id}
            onToggle={() =>
              setOpenStageId((currentId) => (currentId === row.id ? null : row.id))
            }
            onSaved={reload}
          />
        ))}
      </section>

      <CommentThread
        agentId={agent.id}
        rows={rows}
        comments={comments}
        onSaved={reload}
      />
    </div>
  )
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
      <span className="font-semibold tracking-wide text-white/55 uppercase">{label}</span>
      <span className="font-semibold text-white capitalize">{value}</span>
    </span>
  )
}

function StageCard({
  row,
  position,
  substeps,
  open,
  onToggle,
  onSaved,
}: {
  row: AgentStage & { stage: Stage }
  position: number
  substeps: AgentSubstep[]
  open: boolean
  onToggle: () => void
  onSaved: () => Promise<void>
}) {
  const behind = isStageBehind(row)
  const done = substeps.filter((s) => s.status === 'complete').length
  const isComplete = row.status === 'complete'
  const isCurrent = row.status === 'in_progress'

  async function updateStage(patch: Partial<AgentStage>) {
    const { error } = await supabase.from('agent_stages').update(patch).eq('id', row.id)
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function toggleSubstep(step: AgentSubstep) {
    const next: ProgressStatus = step.status === 'complete' ? 'not_started' : 'complete'
    const { error } = await supabase
      .from('agent_substeps')
      .update({
        status: next,
        actual_end: next === 'complete' ? todayISO() : null,
        actual_start:
          next === 'complete' && !step.actual_start ? todayISO() : step.actual_start,
      })
      .eq('id', step.id)
    if (error) window.alert(error.message)
    else await onSaved()
  }

  return (
    <article
      className={[
        'dark:bg-ink-900 overflow-hidden rounded-2xl border bg-white transition-shadow',
        behind
          ? 'border-amber-300 shadow-amber-100 dark:border-amber-500/40 dark:shadow-none shadow-md'
          : 'border-ink-200/80 dark:border-ink-800',
        isCurrent ? 'ring-brand-100 dark:ring-brand-500/20 ring-2' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="hover:bg-ink-50/60 dark:hover:bg-ink-800/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition md:px-5"
      >
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
            isComplete
              ? 'bg-emerald-500 text-white'
              : isCurrent
                ? 'bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
          ].join(' ')}
        >
          {isComplete ? <CheckIcon className="h-4 w-4" /> : position}
        </span>

        <span className="min-w-0 flex-1">
          <span className="text-ink-900 dark:text-ink-50 block truncate font-bold">
            {row.stage.name}
          </span>
          <span className="text-ink-400 block text-xs">
            {substeps.length > 0 ? `${done}/${substeps.length} steps done` : 'No sub-steps'}
            {row.actual_start ? ` · started ${formatDate(row.actual_start)}` : ''}
          </span>
        </span>

        <span
          className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline-flex ${STATUS_PILL[row.status]}`}
        >
          {statusLabel(row.status)}
        </span>

        <svg
          viewBox="0 0 16 16"
          className={`text-ink-400 h-4 w-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m3.5 6 4.5 4.5L12.5 6"
          />
        </svg>
      </button>

      {open ? (
        <div className="border-ink-100 dark:border-ink-800 space-y-5 border-t px-4 py-4 md:px-5">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Expected days">
              <input
                type="number"
                min={0}
                defaultValue={row.expected_duration_days}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onBlur={(e) => {
                  const value = Number(e.target.value)
                  if (value !== row.expected_duration_days) {
                    void updateStage({ expected_duration_days: value })
                  }
                }}
              />
            </Field>
            <Field label="Actual start">
              <input
                type="date"
                defaultValue={row.actual_start ?? ''}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onBlur={(e) => {
                  const value = e.target.value || null
                  if (value !== row.actual_start) void updateStage({ actual_start: value })
                }}
              />
            </Field>
            <Field label="Actual end">
              <input
                type="date"
                defaultValue={row.actual_end ?? ''}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onBlur={(e) => {
                  const value = e.target.value || null
                  if (value !== row.actual_end) void updateStage({ actual_end: value })
                }}
              />
            </Field>
            <Field label="Status">
              <select
                value={row.status}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onChange={(e) =>
                  void updateStage({ status: e.target.value as ProgressStatus })
                }
              >
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="complete">Complete</option>
                <option value="blocked">Blocked</option>
              </select>
            </Field>
          </div>

          <ul className="space-y-1">
            {substeps.map((step) => {
              const stepDone = step.status === 'complete'
              const stepActive = step.status === 'in_progress'
              return (
                <li
                  key={step.id}
                  className={[
                    'flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                    stepActive
                      ? 'bg-brand-50/70 dark:bg-brand-500/10'
                      : 'hover:bg-ink-50 dark:hover:bg-ink-800/40',
                  ].join(' ')}
                >
                  <button
                    type="button"
                    onClick={() => void toggleSubstep(step)}
                    aria-pressed={stepDone}
                    aria-label={`Mark ${step.name} ${stepDone ? 'not done' : 'done'}`}
                    className={[
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                      stepDone
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink-300 hover:border-brand-500 dark:border-ink-600 bg-white dark:bg-transparent',
                    ].join(' ')}
                  >
                    {stepDone ? <CheckIcon className="pop h-3 w-3" /> : null}
                  </button>

                  <span className="min-w-0 flex-1">
                    <span
                      className={
                        stepDone
                          ? 'text-ink-400 dark:text-ink-500 block line-through'
                          : 'text-ink-800 dark:text-ink-100 block font-medium'
                      }
                    >
                      {step.name}
                    </span>
                    <span className="text-ink-400 block text-xs">
                      {statusLabel(step.status)}
                      {step.actual_start ? ` · started ${formatDate(step.actual_start)}` : ''}
                      {step.actual_end ? ` · ended ${formatDate(step.actual_end)}` : ''}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </article>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="text-ink-800 dark:text-ink-100 mt-1 block text-sm">{children}</span>
    </label>
  )
}

function AgentActions({
  agent,
  rows,
  onSaved,
}: {
  agent: Agent
  rows: Array<AgentStage & { stage: Stage }>
  onSaved: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const index = rows.findIndex((r) => r.stage_id === agent.current_stage_id)

  async function setCurrent(nextIndex: number) {
    const next = rows[nextIndex]
    const current = rows[index]
    if (!next) return

    if (current && nextIndex > index) {
      await supabase
        .from('agent_stages')
        .update({ status: 'complete', actual_end: current.actual_end ?? todayISO() })
        .eq('id', current.id)
    }
    if (current && nextIndex < index) {
      await supabase
        .from('agent_stages')
        .update({ status: 'not_started', actual_end: null })
        .eq('id', current.id)
    }

    await supabase
      .from('agent_stages')
      .update({ status: 'in_progress', actual_start: next.actual_start ?? todayISO() })
      .eq('id', next.id)

    const { error } = await supabase
      .from('agents')
      .update({ current_stage_id: next.stage_id })
      .eq('id', agent.id)
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function setStatus(status: AgentStatus) {
    if (status === 'active' && agent.status === 'pending_approval') {
      const first = rows[0]
      if (first && first.status === 'not_started') {
        const { error: stageError } = await supabase
          .from('agent_stages')
          .update({ status: 'in_progress', actual_start: first.actual_start ?? todayISO() })
          .eq('id', first.id)
        if (stageError) {
          window.alert(stageError.message)
          return
        }
      }
    }
    const { error } = await supabase.from('agents').update({ status }).eq('id', agent.id)
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const goLive = String(form.get('target_go_live') ?? '')
    const studioUrl = String(form.get('copilot_studio_url') ?? '').trim() || null
    if (studioUrl && !isHttpsUrl(studioUrl)) {
      window.alert('Copilot Studio link must be a valid HTTPS URL.')
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('agents')
      .update({
        title: String(form.get('title') ?? '').trim(),
        requester_name: String(form.get('requester_name') ?? '').trim(),
        requester_department: String(form.get('requester_department') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        priority: String(form.get('priority') ?? 'medium') as AgentPriority,
        assigned_to: String(form.get('assigned_to') ?? '').trim(),
        target_go_live: goLive || null,
        copilot_studio_url: studioUrl,
      })
      .eq('id', agent.id)
    setBusy(false)
    if (error) window.alert(error.message)
    else {
      setEditing(false)
      await onSaved()
    }
  }

  async function deleteAgent() {
    const confirmed = window.confirm(
      `Delete “${agent.title}”? Its stages, sub-steps, and comments go with it and cannot be recovered.`,
    )
    if (!confirmed) return
    setBusy(true)
    const { error } = await supabase.from('agents').delete().eq('id', agent.id)
    setBusy(false)
    if (error) window.alert(error.message)
    else navigate('/')
  }

  return (
    <div className="border-brand-200 bg-brand-50/60 dark:border-brand-500/30 dark:bg-brand-500/10 space-y-3 rounded-2xl border border-dashed p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-brand-700 dark:text-brand-300 mr-1 text-xs font-bold tracking-[0.12em] uppercase">
          Actions
        </span>
        <button
          type="button"
          className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 rounded-full border bg-white px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={index <= 0}
          onClick={() => void setCurrent(index - 1)}
        >
          Roll back
        </button>
        <button
          type="button"
          className="bg-brand-600 shadow-brand-600/25 hover:bg-brand-700 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={index < 0 || index >= rows.length - 1}
          onClick={() => void setCurrent(index + 1)}
        >
          Advance stage
        </button>
        <button
          type="button"
          aria-expanded={editing}
          className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 rounded-full border bg-white px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5"
          onClick={() => setEditing((open) => !open)}
        >
          {editing ? 'Close editor' : 'Edit details'}
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-full border border-red-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-red-600 transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 dark:border-red-500/40 dark:bg-ink-900 dark:text-red-400"
          onClick={() => void deleteAgent()}
        >
          Delete
        </button>
        <select
          className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 ml-auto rounded-full border bg-white px-3 py-1.5 text-sm font-medium"
          value={agent.status}
          onChange={(e) => void setStatus(e.target.value as AgentStatus)}
        >
          <option value="pending_approval">Pending approval</option>
          <option value="active">Active</option>
          <option value="on_hold">On hold</option>
          <option value="cancelled">Cancelled</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {editing ? (
        <form
          onSubmit={(e) => void saveDetails(e)}
          className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2"
        >
          <EditField label="Title" name="title" defaultValue={agent.title} required />
          <EditField
            label="Requester"
            name="requester_name"
            defaultValue={agent.requester_name}
            required
          />
          <EditField
            label="Department"
            name="requester_department"
            defaultValue={agent.requester_department}
            required
          />
          <EditField label="Owner" name="assigned_to" defaultValue={agent.assigned_to} required />
          <Field label="Priority">
            <select
              name="priority"
              defaultValue={agent.priority}
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Target go live">
            <input
              type="date"
              name="target_go_live"
              defaultValue={agent.target_go_live ?? ''}
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Copilot Studio link">
              <input
                type="url"
                name="copilot_studio_url"
                defaultValue={agent.copilot_studio_url ?? ''}
                placeholder="https://copilotstudio.microsoft.com/..."
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                name="description"
                rows={3}
                defaultValue={agent.description}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full resize-y rounded-lg border px-2 py-1.5 outline-none"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-ink-900 hover:bg-ink-800 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-full px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save details'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink-500 dark:text-ink-400 px-2 py-1.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

function EditField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
}) {
  return (
    <Field label={label}>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
      />
    </Field>
  )
}

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

function CommentThread({
  agentId,
  rows,
  comments,
  onSaved,
}: {
  agentId: string
  rows: Array<AgentStage & { stage: Stage }>
  comments: Comment[]
  onSaved: () => Promise<void>
}) {
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
    writeStored(COMMENT_EMAIL_KEY, authorEmail.trim())
    setSaving(true)
    const { error } = await supabase.from('comments').insert({
      agent_id: agentId,
      agent_stage_id: stageId || null,
      author_email: authorEmail.trim() || 'anonymous',
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
        Comments
      </h3>

      <form
        onSubmit={(e) => void submit(e)}
        className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
      >
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
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Post an update for everyone watching this agent…"
          className="border-ink-200 focus:border-brand-500 focus:ring-brand-100 dark:border-ink-700 dark:text-ink-100 dark:focus:ring-brand-500/20 w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-4"
        />
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="submit"
            disabled={saving || !body.trim() || !authorName.trim()}
            className="bg-ink-900 hover:bg-ink-800 dark:bg-brand-600 dark:hover:bg-brand-500 ml-auto rounded-full px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {saving ? 'Posting…' : 'Post update'}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {comments.map((comment) => (
          <li
            key={comment.id}
            className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-900 flex gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm"
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
