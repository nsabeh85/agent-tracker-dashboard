import { useMemo, useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { CommentThread } from '../components/CommentThread'
import { ProgressBar } from '../components/ProgressBar'
import { ScheduleMarker } from '../components/ScheduleMarker'
import { CheckIcon } from '../components/StageIcon'
import { ThemeToggle } from '../components/ThemeToggle'
import { isDemoMode } from '../lib/supabase'
import { dueLabel, formatDate, isLiveAgent, statusLabel } from '../lib/schedule'
import { isTrackingToken } from '../lib/tracking'
import {
  orderedAgentStages,
  useCatalog,
  usePublicAgent,
  useRealtimeTick,
} from '../hooks/useTracker'
import type {
  AgentStage,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Stage,
} from '../types/database'

export function PublicTrackPage() {
  const { token } = useParams()
  const validToken = isTrackingToken(token) ? token : undefined
  const tick = useRealtimeTick()
  const { stages } = useCatalog(tick)
  const { agent, substeps, comments, loading, error, reload } = usePublicAgent(validToken, tick)

  const rows = useMemo(
    () => (agent ? orderedAgentStages(agent.agent_stages, stages) : []),
    [agent, stages],
  )

  return (
    <div className="min-h-svh">
      <header className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-950/70 sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="from-brand-500 to-brand-700 shadow-brand-600/30 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" aria-hidden>
                <circle cx="5" cy="12" r="2.6" fill="currentColor" />
                <circle cx="12" cy="12" r="2.6" fill="currentColor" />
                <circle cx="19" cy="12" r="2.6" fill="currentColor" opacity="0.45" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="text-ink-400 block text-[10px] font-bold tracking-[0.2em] uppercase">
                Copilot Studio
              </span>
              <span className="text-ink-900 dark:text-ink-50 block truncate text-lg font-bold tracking-tight">
                Request tracker
              </span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {isDemoMode ? (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Preview data. Connect Supabase to load a real request.
        </div>
      ) : null}

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {!validToken ? (
          <MissingLink />
        ) : loading ? (
          <div className="skeleton h-72 rounded-3xl" />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !agent ? (
          <MissingLink />
        ) : (
          <PublicAgentView
            agent={agent}
            stages={stages}
            rows={rows}
            substeps={substeps}
            comments={comments}
            onSaved={reload}
          />
        )}
      </main>

      <footer className="text-ink-400 dark:text-ink-500 mx-auto max-w-3xl px-4 pb-10 text-center text-xs">
        This page shows only this request. Bookmark the link to check back for updates.
      </footer>
    </div>
  )
}

function MissingLink() {
  return (
    <div className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 rounded-3xl border bg-white p-8 text-center shadow-sm">
      <h1 className="text-ink-900 dark:text-ink-50 text-xl font-bold">Tracking link not found</h1>
      <p className="text-ink-500 dark:text-ink-400 mx-auto mt-2 max-w-md text-sm leading-relaxed">
        This URL is invalid or the request was removed. Ask the team for a new tracking link.
      </p>
    </div>
  )
}

function PublicAgentView({
  agent,
  stages,
  rows,
  substeps,
  comments,
  onSaved,
}: {
  agent: AgentWithStages
  stages: Stage[]
  rows: Array<AgentStage & { stage: Stage }>
  substeps: AgentSubstep[]
  comments: Comment[]
  onSaved: () => Promise<void>
}) {
  const current = stages.find((s) => s.id === agent.current_stage_id)
  const live = isLiveAgent(agent, stages)

  return (
    <>
      <div className="space-y-2 pt-2 text-center">
        <h1 className="text-ink-900 dark:text-ink-50 text-2xl font-bold tracking-tight md:text-3xl">
          {agent.title}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 rounded-full px-3 py-1 text-xs font-semibold">
            {live ? 'Live' : (current?.name ?? '—')}
          </span>
          <ScheduleMarker
            agent={agent}
            agentStages={agent.agent_stages}
            stages={stages}
            withLabel
          />
        </div>
      </div>

      <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 rounded-3xl border bg-white p-6 shadow-sm md:px-10 md:py-8">
        <ProgressBar
          stages={stages}
          currentStageId={agent.current_stage_id}
          agentStatus={agent.status}
          size="lg"
        />
        <div className="border-ink-100 dark:border-ink-800 mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t pt-4 text-sm">
          <span className="text-ink-500 dark:text-ink-400">
            Target go live {formatDate(agent.target_go_live)}
          </span>
          <span className="text-ink-300 dark:text-ink-700">·</span>
          <span
            className={`font-semibold ${
              live ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-700 dark:text-ink-200'
            }`}
          >
            {live ? 'Live now' : dueLabel(agent.target_go_live)}
          </span>
        </div>
      </section>

      <Dropdown title="Request details" summary={agent.requester_name}>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Requester" value={agent.requester_name} />
          <Detail label="Current stage" value={current?.name ?? '—'} />
          <Detail label="Status" value={statusLabel(agent.status)} />
          <Detail label="Target go live" value={formatDate(agent.target_go_live)} />
        </dl>
        {agent.description ? (
          <p className="text-ink-600 dark:text-ink-300 mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {agent.description}
          </p>
        ) : null}
      </Dropdown>

      <Dropdown title="Stage breakdown" summary={`${rows.length} stages`}>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <StageDropdown
              key={row.id}
              row={row}
              position={index + 1}
              substeps={substeps.filter((s) => s.agent_stage_id === row.id)}
            />
          ))}
        </div>
      </Dropdown>

      <CommentThread
        agentId={agent.id}
        rows={rows}
        comments={comments}
        onSaved={onSaved}
        variant="public"
      />
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">{label}</dt>
      <dd className="text-ink-800 dark:text-ink-100 mt-0.5 font-medium">{value}</dd>
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
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
  )
}

function Dropdown({
  title,
  summary,
  children,
}: {
  title: string
  summary?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="hover:bg-ink-50/60 dark:hover:bg-ink-800/40 flex w-full items-center gap-3 px-4 py-3.5 text-left transition md:px-5"
      >
        <span className="min-w-0 flex-1">
          <span className="text-ink-900 dark:text-ink-50 block text-sm font-bold">{title}</span>
          {summary ? <span className="text-ink-400 block truncate text-xs">{summary}</span> : null}
        </span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="border-ink-100 dark:border-ink-800 border-t px-4 py-4 md:px-5">
          {children}
        </div>
      ) : null}
    </section>
  )
}

function StageDropdown({
  row,
  position,
  substeps,
}: {
  row: AgentStage & { stage: Stage }
  position: number
  substeps: AgentSubstep[]
}) {
  const [open, setOpen] = useState(false)
  const done = substeps.filter((s) => s.status === 'complete').length
  const isComplete = row.status === 'complete'
  const isCurrent = row.status === 'in_progress'

  return (
    <article
      className={[
        'dark:bg-ink-950/40 overflow-hidden rounded-xl border bg-white',
        isCurrent
          ? 'border-brand-200 dark:border-brand-500/40'
          : 'border-ink-200/80 dark:border-ink-800',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="hover:bg-ink-50/60 dark:hover:bg-ink-800/40 flex w-full items-center gap-3 px-3 py-3 text-left transition"
      >
        <span
          className={[
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            isComplete
              ? 'bg-emerald-500 text-white'
              : isCurrent
                ? 'bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
          ].join(' ')}
        >
          {isComplete ? <CheckIcon className="h-3.5 w-3.5" /> : position}
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink-900 dark:text-ink-50 block truncate text-sm font-bold">
            {row.stage.name}
          </span>
          <span className="text-ink-400 block text-xs">
            {substeps.length > 0
              ? `${done}/${substeps.length} steps done`
              : statusLabel(row.status)}
          </span>
        </span>
        <span className="text-ink-500 dark:text-ink-400 hidden text-xs font-semibold sm:inline">
          {statusLabel(row.status)}
        </span>
        <Chevron open={open} />
      </button>

      {open ? (
        <ul className="border-ink-100 dark:border-ink-800 space-y-1 border-t px-3 py-3">
          {substeps.length === 0 ? (
            <li className="text-ink-400 text-sm">No steps listed for this stage.</li>
          ) : (
            substeps.map((step) => {
              const stepDone = step.status === 'complete'
              return (
                <li key={step.id} className="flex items-start gap-3 px-1 py-1.5 text-sm">
                  <span
                    className={[
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                      stepDone
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-ink-300 dark:border-ink-600',
                    ].join(' ')}
                  >
                    {stepDone ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                  </span>
                  <span
                    className={
                      stepDone
                        ? 'text-ink-400 dark:text-ink-500 line-through'
                        : 'text-ink-800 dark:text-ink-100 font-medium'
                    }
                  >
                    {step.name}
                  </span>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </article>
  )
}
