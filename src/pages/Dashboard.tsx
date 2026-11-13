import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AgentTitle } from '../components/AgentTitle'
import { CheckListSelect } from '../components/CheckListSelect'
import { SavingsBreakdown } from '../components/SavingsBreakdown'
import { SavingsCheckIns } from '../components/SavingsCheckIns'
import { SummaryStrip } from '../components/SummaryStrip'
import { ProgressBar } from '../components/ProgressBar'
import { ScheduleMarker } from '../components/ScheduleMarker'
import { useAgents, useCatalog, useRealtimeTick } from '../hooks/useTracker'
import {
  compareAgents,
  leftBarTone,
  matchesBoardFilters,
  matchesDashboardMetric,
  type DashboardMetric,
  type DashboardSort,
} from '../lib/dashboard'
import {
  dueLabel,
  formatDate,
  initials,
  isAgentBehind,
  isLiveAgent,
  isPastTargetGoLive,
  statusLabel,
} from '../lib/schedule'
import { formatUsd, liveRealizedSavings, savingsLabel, wentLiveISO } from '../lib/savings'
import type { AgentPriority, AgentStatus, AgentWithStages, Stage } from '../types/database'

const STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'backlog', label: 'Backlog' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'complete', label: 'Complete' },
]

const LEFT_BAR: Record<ReturnType<typeof leftBarTone>, string> = {
  hold: 'bg-red-500',
  blocked: 'bg-red-500',
  overdue: 'bg-red-500',
  behind: 'bg-amber-400',
  live: 'bg-emerald-500',
  default: 'bg-brand-500',
}


const PRIORITY_STYLE: Record<AgentPriority, string> = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  medium:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
  low: 'bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700',
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 md:min-w-36">
      <span className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
        {label}
      </span>
      <select
        className="border-ink-200 text-ink-800 hover:border-brand-300 focus:border-brand-500 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:border-brand-500 dark:focus:ring-brand-500/20 rounded-xl border bg-white px-3 py-2 text-sm font-medium transition outline-none focus:ring-4"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

export function DashboardPage() {
  const tick = useRealtimeTick()
  const { stages, owners: ownerCatalog, departments: departmentCatalog } = useCatalog(tick)
  const owners = ownerCatalog.filter((owner) => owner.active)
  const { agents, loading, error } = useAgents(tick)

  const [stageIds, setStageIds] = useState<string[]>([])
  const [ownerNames, setOwnerNames] = useState<string[]>([])
  const [departmentNames, setDepartmentNames] = useState<string[]>([])
  const [statuses, setStatuses] = useState<AgentStatus[]>([])
  const [summaryMetric, setSummaryMetric] = useState<DashboardMetric | null>(null)
  const [sort, setSort] = useState<DashboardSort>('priority')

  const departments = departmentCatalog.filter((department) => department.active)
  const boardAgents = useMemo(
    () => agents.filter((agent) => agent.status !== 'backlog'),
    [agents],
  )

  const visible = useMemo(() => {
    return agents
      .filter((agent) => {
        if (summaryMetric && !matchesDashboardMetric(agent, stages, summaryMetric)) return false
        return matchesBoardFilters(agent, {
          stageIds,
          owners: ownerNames,
          departments: departmentNames,
          statuses,
        })
      })
      .sort((a, b) => compareAgents(a, b, sort))
  }, [agents, departmentNames, ownerNames, sort, stageIds, stages, statuses, summaryMetric])

  function selectSummaryMetric(metric: DashboardMetric | null) {
    setSummaryMetric(metric)
    setStageIds([])
    setOwnerNames([])
    setDepartmentNames([])
    setStatuses([])
  }

  return (
    <div className="space-y-6">
      <SavingsCheckIns agents={boardAgents} stages={stages} />
      <SummaryStrip
        agents={boardAgents}
        stages={stages}
        activeMetric={summaryMetric}
        onMetricChange={selectSummaryMetric}
      />

      <div className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-900/50 grid grid-cols-2 gap-3 rounded-2xl border bg-white/70 p-3 backdrop-blur-sm sm:grid-cols-3 md:flex md:flex-wrap md:items-end md:p-4">
        <CheckListSelect
          label="Stage"
          emptyLabel="All stages"
          options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
          selected={stageIds}
          onChange={setStageIds}
        />
        <CheckListSelect
          label="Owner"
          emptyLabel="All owners"
          options={owners.map((owner) => ({ value: owner.full_name, label: owner.full_name }))}
          selected={ownerNames}
          onChange={setOwnerNames}
        />
        <CheckListSelect
          label="Department"
          emptyLabel="All departments"
          options={departments.map((department) => ({
            value: department.name,
            label: department.name,
          }))}
          selected={departmentNames}
          onChange={setDepartmentNames}
        />
        <CheckListSelect
          label="Status"
          emptyLabel="All statuses"
          options={STATUS_OPTIONS}
          selected={statuses}
          onChange={(values) => {
            setStatuses(values as AgentStatus[])
            setSummaryMetric(null)
          }}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(value) => setSort(value as DashboardSort)}
        >
          <option value="target">Target date</option>
          <option value="priority">Priority</option>
          <option value="updated">Last updated</option>
        </Select>
        <p className="text-ink-400 ml-auto hidden pb-2 text-xs font-medium sm:block">
          {visible.length} of {agents.length} shown
        </p>
      </div>

      <SavingsBreakdown agents={boardAgents} stages={stages} />

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((n) => (
            <li key={n} className="skeleton h-28 rounded-2xl" />
          ))}
        </ul>
      ) : null}

      {!loading && visible.length === 0 ? (
        <div className="border-ink-200 dark:border-ink-700 dark:bg-ink-900/40 rounded-3xl border border-dashed bg-white/60 py-16 text-center">
          <p className="text-ink-700 dark:text-ink-200 font-semibold">Nothing here yet</p>
          <p className="text-ink-400 mt-1 text-sm">
            No agents match these filters. Try widening the status or stage.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3">
        {visible.map((agent, index) => (
          <AgentListItem key={agent.id} agent={agent} stages={stages} index={index} />
        ))}
      </ul>
    </div>
  )
}

function AgentListItem({
  agent,
  stages,
  index,
}: {
  agent: AgentWithStages
  stages: Stage[]
  index: number
}) {
  const onHold = agent.status === 'on_hold'
  const overdue = !onHold && isPastTargetGoLive(agent, stages)
  const behind = isAgentBehind(agent, agent.agent_stages, stages)
  const live = !onHold && isLiveAgent(agent, stages)
  const wentLive = live ? wentLiveISO(agent, agent.agent_stages, stages) : null
  const savings = live ? savingsLabel(agent.savings_amount, agent.savings_cadence) : null
  const savedSoFar = live ? liveRealizedSavings(agent, stages) : 0
  const ownerSummary =
    agent.agent_owners.map((assignment) => assignment.owner.full_name).join(', ') ||
    agent.assigned_to
  const accent = LEFT_BAR[leftBarTone(agent, stages)]

  return (
    <li className="rise relative" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <Link
        to={`/agents/${agent.id}`}
        className="group border-ink-200/80 hover:border-brand-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/60 relative block overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl md:p-5 md:pl-6 dark:shadow-black/20 dark:hover:shadow-black/40"
      >
        <span className={`absolute inset-y-0 left-0 w-1.5 ${accent}`} aria-hidden />

        <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_auto] md:items-center md:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AgentTitle
                title={agent.title}
                sourceUrl={agent.source_url}
                insideLink
                className="text-ink-900 group-hover:text-brand-700 dark:text-ink-50 dark:group-hover:text-brand-300 text-lg font-bold tracking-tight transition-colors md:text-xl"
                linkClassName="text-brand-700 underline decoration-brand-300 underline-offset-2 dark:text-brand-300"
              />
              <ScheduleMarker
                agent={agent}
                agentStages={agent.agent_stages}
                stages={stages}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span
                className={`rounded-full px-2 py-0.5 font-semibold capitalize ring-1 ${PRIORITY_STYLE[agent.priority]}`}
              >
                {agent.priority}
              </span>
              <span className="bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300 rounded-full px-2 py-0.5 font-medium">
                {agent.requester_department}
              </span>
              {agent.status !== 'active' ? (
                <span
                  className={
                    agent.status === 'on_hold'
                      ? 'rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-800 ring-1 ring-slate-300 dark:bg-slate-500/20 dark:text-slate-100 dark:ring-slate-400/40'
                      : agent.status === 'pending_approval'
                        ? 'rounded-full bg-amber-500 px-2 py-0.5 font-semibold text-white'
                        : 'bg-ink-800 dark:bg-ink-700 rounded-full px-2 py-0.5 font-semibold text-white'
                  }
                >
                  {statusLabel(agent.status)}
                </span>
              ) : null}
              <span className="text-ink-500 dark:text-ink-400 inline-flex items-center gap-1.5 font-medium">
                <span className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold">
                  {initials(ownerSummary)}
                </span>
                {ownerSummary}
              </span>
            </div>
          </div>

          <ProgressBar
            stages={stages}
            currentStageId={agent.current_stage_id}
            agentStatus={agent.status}
            compactCurrentLabel
          />

          <div className="md:text-right">
            <p className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">
              Target go live
            </p>
            <p className="text-ink-900 dark:text-ink-50 text-sm font-bold">
              {formatDate(agent.target_go_live)}
            </p>
            {onHold ? (
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">On hold</p>
            ) : live ? (
              <>
                <p className="text-ink-400 mt-2 text-[10px] font-bold tracking-[0.12em] uppercase">
                  Went live
                </p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {wentLive ? formatDate(wentLive) : 'Not recorded'}
                </p>
              </>
            ) : (
              <p
                className={[
                  'text-xs font-semibold',
                  overdue ? 'text-red-600' : behind ? 'text-amber-600' : 'text-ink-400',
                ].join(' ')}
              >
                {dueLabel(agent.target_go_live)}
              </p>
            )}
            {savings ? (
              <p className="text-emerald-700 dark:text-emerald-400 mt-1 text-xs font-semibold">
                Saves {savings}
                {savedSoFar > 0 ? ` · ${formatUsd(savedSoFar)} so far` : ''}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  )
}
