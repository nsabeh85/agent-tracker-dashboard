import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ProgressBar } from '../components/ProgressBar'
import { ScheduleMarker } from '../components/ScheduleMarker'
import { CheckIcon } from '../components/StageIcon'
import { OwnerMultiSelect } from '../components/OwnerMultiSelect'
import { CopyTrackingLink } from '../components/CopyTrackingLink'
import { DateInput } from '../components/DateInput'
import {
  orderedAgentStages,
  useAgentDetail,
  useCatalog,
  useRealtimeTick,
} from '../hooks/useTracker'
import { useAuth } from '../lib/auth'
import {
  dueLabel,
  formatDate,
  formatDateTime,
  GO_LIVE_BEFORE_TESTING,
  GO_LIVE_REQUIRED,
  STAGES_COMPLETE_BEFORE_LIVE,
  hasIncompleteItemsBeforeLive,
  initials,
  isFilledDate,
  isLiveAgent,
  isStageBehind,
  needsGoLiveDate,
  stageStatusFromItems,
  statusLabel,
  todayISO,
  wouldEnterOrFinishLive,
} from '../lib/schedule'
import { copilotStudioLabel } from '../lib/copilotStudioLink'
import { descriptionWithoutSource, isHttpsUrl, sourceLabel } from '../lib/sourceLink'
import { supabase } from '../lib/supabase'
import { parseSavingsAmount, savingsLabel } from '../lib/savings'
import type {
  Admin,
  AgentPriority,
  AgentStage,
  AgentStageWithOwners,
  AgentStatus,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Department,
  Owner,
  OwnerAssignment,
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
  const { admin } = useAuth()
  const tick = useRealtimeTick()
  const { stages, owners: ownerCatalog, departments } = useCatalog(tick)
  const owners = ownerCatalog.filter((owner) => owner.active)
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
  const liveSavings = isLiveAgent(agent, stages)
    ? savingsLabel(agent.savings_amount, agent.savings_cadence)
    : null
  const displayDescription = descriptionWithoutSource(agent.description, agent.source_url)

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

          {displayDescription ? (
            <p className="max-w-2xl text-sm leading-relaxed text-white/75">
              {displayDescription}
            </p>
          ) : null}
          {agent.source_url ? (
            <a
              href={agent.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
            >
              Source request: {sourceLabel(agent.source_url)}
            </a>
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
            <Chip label="Owners" value={ownerNames(agent.agent_owners, agent.assigned_to)} />
            <Chip label="Stage" value={current?.name ?? '—'} />
            <Chip label="Status" value={statusLabel(agent.status)} />
            {liveSavings ? <Chip label="Savings" value={liveSavings} /> : null}
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

      {admin ? (
        <>
          <AgentActions
            agent={agent}
            rows={rows}
            substeps={substeps}
            owners={owners}
            departments={departments}
            onSaved={reload}
          />
          <CopyTrackingLink
            token={agent.public_token}
            title={agent.title}
            requesterName={agent.requester_name}
          />
        </>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-ink-400 px-1 text-xs font-bold tracking-[0.12em] uppercase">
          Stage breakdown
        </h3>
        {rows.map((row, index) => (
          <StageCard
            key={row.id}
            row={row}
            position={index + 1}
            canEdit={Boolean(admin)}
            owners={owners}
            currentStageId={agent.current_stage_id}
            stageRows={rows}
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
        author={admin}
        onSaved={reload}
      />
    </div>
  )
}

function ownerNames(assignments: OwnerAssignment[], fallback = 'Unassigned'): string {
  const names = assignments.map((assignment) => assignment.owner.full_name)
  return names.length ? names.join(', ') : fallback
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
  canEdit,
  owners,
  currentStageId,
  stageRows,
  substeps,
  open,
  onToggle,
  onSaved,
}: {
  row: AgentStageWithOwners & { stage: Stage }
  position: number
  canEdit: boolean
  owners: Owner[]
  currentStageId: string
  stageRows: Array<AgentStage & { stage: Stage }>
  substeps: AgentSubstep[]
  open: boolean
  onToggle: () => void
  onSaved: () => Promise<void>
}) {
  const behind = isStageBehind(row)
  const done = substeps.filter((s) => s.status === 'complete').length
  const itemStatus = stageStatusFromItems(substeps)
  const displayedStatus = row.status === 'blocked' ? 'blocked' : itemStatus
  const isComplete = displayedStatus === 'complete'
  const isCurrent = row.stage_id === currentStageId
  const currentRow = stageRows.find((stage) => stage.stage_id === currentStageId)
  const isLater = Boolean(
    currentRow && row.stage.sort_order > currentRow.stage.sort_order,
  )

  async function updateStage(patch: Partial<AgentStage>) {
    const { error } = await supabase.from('agent_stages').update(patch).eq('id', row.id)
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function updateStageOwners(ownerIds: string[]) {
    const { error } = await supabase.rpc('set_agent_stage_owners', {
      p_agent_stage_id: row.id,
      p_owner_ids: ownerIds,
    })
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function toggleSubstep(step: AgentSubstep) {
    const next: ProgressStatus = step.status === 'complete' ? 'not_started' : 'complete'
    if (isLater) {
      window.alert('Finish the current stage before changing a later stage.')
      return
    }
    const { error } = await supabase.rpc('set_agent_substep_status', {
      p_agent_substep_id: step.id,
      p_status: next,
    })
    if (error) {
      window.alert(error.message)
      return
    }
    await onSaved()
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
            {row.agent_stage_owners.length > 0
              ? ` · ${ownerNames(row.agent_stage_owners)}`
              : ''}
          </span>
        </span>

        <span
          className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline-flex ${STATUS_PILL[displayedStatus]}`}
        >
          {statusLabel(displayedStatus)}
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
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Expected days">
              <input
                type="number"
                min={0}
                disabled={!canEdit}
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
              <DateInput
                key={row.actual_start ?? 'unset'}
                disabled={!canEdit}
                defaultValue={row.actual_start ?? ''}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onBlur={(e) => {
                  const value = e.target.value || null
                  if (value !== row.actual_start) void updateStage({ actual_start: value })
                }}
              />
            </Field>
            <Field label="Actual end">
              <DateInput
                key={row.actual_end ?? 'unset'}
                disabled={!canEdit}
                defaultValue={row.actual_end ?? ''}
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
                onBlur={(e) => {
                  const value = e.target.value || null
                  if (value !== row.actual_end) void updateStage({ actual_end: value })
                }}
              />
            </Field>
            <FieldGroup label="Status (automatic)">
              <span className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${STATUS_PILL[displayedStatus]}`}>
                  {statusLabel(displayedStatus)}
                </span>
                {canEdit && isCurrent && displayedStatus !== 'complete' ? (
                  <button
                    type="button"
                    onClick={() =>
                      void updateStage({
                        status: displayedStatus === 'blocked' ? itemStatus : 'blocked',
                      })
                    }
                    className="text-ink-500 dark:text-ink-400 text-xs font-medium"
                  >
                    {displayedStatus === 'blocked' ? 'Clear block' : 'Mark blocked'}
                  </button>
                ) : null}
              </span>
            </FieldGroup>
            <FieldGroup label="Stage owners">
              <OwnerMultiSelect
                owners={owners}
                selectedIds={row.agent_stage_owners.map((assignment) => assignment.owner_id)}
                onChange={(ownerIds) => void updateStageOwners(ownerIds)}
                disabled={!canEdit}
              />
            </FieldGroup>
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
                    disabled={!canEdit || isLater}
                    onClick={() => void toggleSubstep(step)}
                    aria-pressed={stepDone}
                    aria-label={`Mark ${step.name} ${stepDone ? 'not done' : 'done'}`}
                    className={[
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40',
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

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="text-ink-800 dark:text-ink-100 mt-1 block text-sm">{children}</span>
    </div>
  )
}

function AgentActions({
  agent,
  rows,
  substeps,
  owners,
  departments,
  onSaved,
}: {
  agent: AgentWithStages
  rows: Array<AgentStageWithOwners & { stage: Stage }>
  substeps: AgentSubstep[]
  owners: Owner[]
  departments: Department[]
  onSaved: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ownerIds, setOwnerIds] = useState(() =>
    agent.agent_owners.map((assignment) => assignment.owner_id),
  )
  const index = rows.findIndex((r) => r.stage_id === agent.current_stage_id)

  async function reopenPreviousStage() {
    const previous = rows[index - 1]
    if (!previous) return
    if (
      !window.confirm(
        `Reopen ${previous.stage.name}? This resets that stage and every later stage.`,
      )
    ) {
      return
    }
    const { error } = await supabase.rpc('reopen_agent_stage', {
      p_agent_id: agent.id,
      p_agent_stage_id: previous.id,
    })
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function advanceStage() {
    const current = rows[index]
    if (!current) return
    const next = rows[index + 1]
    if (needsGoLiveDate(next?.stage.name, agent.target_go_live)) {
      window.alert(GO_LIVE_BEFORE_TESTING)
      return
    }
    if (
      wouldEnterOrFinishLive(current.stage.name, next?.stage.name) &&
      hasIncompleteItemsBeforeLive(rows, substeps)
    ) {
      window.alert(STAGES_COMPLETE_BEFORE_LIVE)
      return
    }
    const confirmed = window.confirm(
      next
        ? `Advance ${current.stage.name} now? Remaining items in this stage will be marked complete, then the tracker moves to ${next.stage.name}.`
        : `Advance ${current.stage.name} now? Remaining items will be marked complete and this agent will be Complete.`,
    )
    if (!confirmed) return
    const { error } = await supabase.rpc('advance_agent_stage', {
      p_agent_id: agent.id,
      p_agent_stage_id: current.id,
    })
    if (error) window.alert(error.message)
    else await onSaved()
  }

  async function setStatus(status: AgentStatus) {
    if (agent.status === 'complete' && status !== 'complete') {
      window.alert('Reopen a completed item before changing this agent from Complete.')
      return
    }
    if (status === 'complete' && agent.status !== 'complete') {
      window.alert('The agent becomes complete automatically when every Live item is complete.')
      return
    }
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
    if (ownerIds.length === 0) {
      window.alert('Select at least one owner.')
      return
    }
    const form = new FormData(event.currentTarget)
    const goLive = String(form.get('target_go_live') ?? '').trim()
    if (!isFilledDate(goLive)) {
      window.alert(GO_LIVE_REQUIRED)
      return
    }
    const sourceUrl = String(form.get('source_url') ?? '').trim()
    if (!isHttpsUrl(sourceUrl)) {
      window.alert('Source request must be a valid HTTPS URL.')
      return
    }
    const studioUrl = String(form.get('copilot_studio_url') ?? '').trim()
    if (!isHttpsUrl(studioUrl)) {
      window.alert('Copilot Studio link must be a valid HTTPS URL.')
      return
    }
    const savings = parseSavingsAmount(String(form.get('savings_amount') ?? ''))
    if (savings === 'invalid') {
      window.alert('Money saved must be a number 0 or greater.')
      return
    }
    setBusy(true)
    const { error: detailError } = await supabase
      .from('agents')
      .update({
        title: String(form.get('title') ?? '').trim(),
        requester_name: String(form.get('requester_name') ?? '').trim(),
        requester_department: String(form.get('requester_department') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        priority: String(form.get('priority') ?? 'medium') as AgentPriority,
        source_url: sourceUrl || null,
        target_go_live: goLive,
        copilot_studio_url: studioUrl || null,
        savings_amount: savings,
        savings_cadence: String(form.get('savings_cadence') ?? 'yearly') === 'monthly' ? 'monthly' : 'yearly',
      })
      .eq('id', agent.id)
    if (detailError) {
      setBusy(false)
      window.alert(detailError.message)
      return
    }
    const { error: ownerError } = await supabase.rpc('set_agent_owners', {
      p_agent_id: agent.id,
      p_owner_ids: ownerIds,
    })
    setBusy(false)
    if (ownerError) {
      window.alert(ownerError.message)
      return
    }
    setEditing(false)
    await onSaved()
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
          onClick={() => void reopenPreviousStage()}
        >
          Roll back
        </button>
        <button
          type="button"
          className="bg-brand-600 shadow-brand-600/25 hover:bg-brand-700 rounded-full px-3.5 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0"
          disabled={busy || index < 0}
          onClick={() => void advanceStage()}
        >
          Advance stage
        </button>
        <button
          type="button"
          aria-expanded={editing}
          className="border-ink-200 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 rounded-full border bg-white px-3.5 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5"
          onClick={() => {
            setOwnerIds(agent.agent_owners.map((assignment) => assignment.owner_id))
            setEditing((open) => !open)
          }}
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
          <option value="complete" disabled={agent.status !== 'complete'}>
            Complete (automatic)
          </option>
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
          <Field label="Department">
            <select
              name="requester_department"
              defaultValue={agent.requester_department}
              required
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            >
              {!departments.some(
                (department) =>
                  department.active && department.name === agent.requester_department,
              ) ? (
                <option value={agent.requester_department}>{agent.requester_department}</option>
              ) : null}
              {departments
                .filter((department) => department.active)
                .map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
            </select>
          </Field>
          <FieldGroup label="Owners">
            <OwnerMultiSelect
              owners={owners}
              selectedIds={ownerIds}
              onChange={setOwnerIds}
              required
            />
          </FieldGroup>
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
            <DateInput
              name="target_go_live"
              required
              defaultValue={agent.target_go_live ?? ''}
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            />
          </Field>
          <Field label="Money saved">
            <input
              type="number"
              name="savings_amount"
              min={0}
              step="0.01"
              defaultValue={agent.savings_amount ?? ''}
              placeholder="e.g. 12000"
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            />
          </Field>
          <Field label="Savings period">
            <select
              name="savings_cadence"
              defaultValue={agent.savings_cadence}
              className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
            >
              <option value="yearly">Yearly</option>
              <option value="monthly">Monthly</option>
            </select>
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
          <div className="sm:col-span-2">
            <Field label="Source request link">
              <input
                type="url"
                name="source_url"
                defaultValue={agent.source_url ?? ''}
                placeholder="https://digitalrealty-cdo.atlassian.net/browse/PCT-123"
                className="border-ink-200 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 w-full rounded-lg border px-2 py-1.5 outline-none"
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

function CommentThread({
  agentId,
  rows,
  comments,
  author,
  onSaved,
}: {
  agentId: string
  rows: Array<AgentStage & { stage: Stage }>
  comments: Comment[]
  author: Admin | null
  onSaved: () => Promise<void>
}) {
  const [body, setBody] = useState('')
  const [stageId, setStageId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!author || !body.trim()) return
    setSaving(true)
    const { error } = await supabase.from('comments').insert({
      agent_id: agentId,
      agent_stage_id: stageId || null,
      author_email: author.email,
      author_name: author.display_name,
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

      {author ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="border-ink-200/80 dark:border-ink-800 dark:bg-ink-900 space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
        >
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
            disabled={saving || !body.trim()}
            className="bg-ink-900 hover:bg-ink-800 dark:bg-brand-600 dark:hover:bg-brand-500 ml-auto rounded-full px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-40"
          >
            {saving ? 'Posting…' : 'Post update'}
          </button>
        </div>
        </form>
      ) : (
        <p className="text-ink-400 px-1 text-sm">Comments are read-only.</p>
      )}

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
