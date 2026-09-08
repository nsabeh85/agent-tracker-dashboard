import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SummaryStrip } from '../components/SummaryStrip'
import { ProgressBar } from '../components/ProgressBar'
import { ScheduleMarker } from '../components/ScheduleMarker'
import { useAgents, useCatalog, useRealtimeTick } from '../hooks/useTracker'
import {
  dueLabel,
  formatDate,
  initials,
  isAgentBehind,
  isLiveAgent,
  isPastTargetGoLive,
  statusLabel,
} from '../lib/schedule'
import type { AgentPriority, AgentWithStages, Stage } from '../types/database'

type SortKey = 'target' | 'priority' | 'updated'
type StatusFilter = 'all' | 'pending_approval' | 'active'

const PRIORITY_RANK: Record<AgentPriority, number> = { high: 0, medium: 1, low: 2 }

const PRIORITY_STYLE: Record<AgentPriority, string> = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
  medium:
    'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
  low: 'bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700',
}

function compareAgents(a: AgentWithStages, b: AgentWithStages, sort: SortKey): number {
  if (sort === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  if (sort === 'updated') return b.updated_at.localeCompare(a.updated_at)
  const aDate = a.target_go_live ?? '9999-12-31'
  const bDate = b.target_go_live ?? '9999-12-31'
  return aDate.localeCompare(bDate)
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
  const { stages, owners: ownerCatalog } = useCatalog(tick)
  const owners = ownerCatalog.filter((owner) => owner.active)
  const { agents, loading, error } = useAgents(tick)

  const [stageId, setStageId] = useState('')
  const [owner, setOwner] = useState('')
  const [department, setDepartment] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('target')

  const departments = useMemo(
    () => [...new Set(agents.map((a) => a.requester_department))].sort(),
    [agents],
  )

  const visible = useMemo(() => {
    return agents
      .filter((agent) => {
        if (statusFilter !== 'all' && agent.status !== statusFilter) return false
        if (stageId && agent.current_stage_id !== stageId) return false
        if (
          owner &&
          !agent.agent_owners.some((assignment) => assignment.owner.full_name === owner) &&
          !(agent.agent_owners.length === 0 && agent.assigned_to === owner)
        ) {
          return false
        }
        if (department && agent.requester_department !== department) return false
        return true
      })
      .sort((a, b) => compareAgents(a, b, sort))
  }, [agents, department, owner, sort, stageId, statusFilter])

  return (
    <div className="space-y-6">
      <SummaryStrip agents={agents} stages={stages} />

      <div className="border-ink-200/70 dark:border-ink-800 dark:bg-ink-900/50 grid grid-cols-2 gap-3 rounded-2xl border bg-white/70 p-3 backdrop-blur-sm sm:grid-cols-3 md:flex md:flex-wrap md:items-end md:p-4">
        <Select label="Stage" value={stageId} onChange={setStageId}>
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Owner" value={owner} onChange={setOwner}>
          <option value="">All owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.full_name}>
              {owner.full_name}
            </option>
          ))}
        </Select>
        <Select label="Department" value={department} onChange={setDepartment}>
          <option value="">All departments</option>
          {departments.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="pending_approval">Pending approval</option>
          <option value="active">Active only</option>
        </Select>
        <Select label="Sort" value={sort} onChange={(value) => setSort(value as SortKey)}>
          <option value="target">Target date</option>
          <option value="priority">Priority</option>
          <option value="updated">Last updated</option>
        </Select>
        <p className="text-ink-400 ml-auto hidden pb-2 text-xs font-medium sm:block">
          {visible.length} of {agents.length} shown
        </p>
      </div>

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
  const overdue = isPastTargetGoLive(agent, stages)
  const behind = isAgentBehind(agent, agent.agent_stages, stages)
  const live = isLiveAgent(agent, stages)
  const ownerSummary =
    agent.agent_owners.map((assignment) => assignment.owner.full_name).join(', ') ||
    agent.assigned_to
  const accent = overdue
    ? 'bg-red-500'
    : behind
      ? 'bg-amber-400'
      : live
        ? 'bg-emerald-500'
        : 'bg-brand-500'

  return (
    <li className="rise" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
      <Link
        to={`/agents/${agent.id}`}
        className="group border-ink-200/80 hover:border-brand-300 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/60 relative block overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl md:p-5 md:pl-6 dark:shadow-black/20 dark:hover:shadow-black/40"
      >
        <span className={`absolute inset-y-0 left-0 w-1.5 ${accent}`} aria-hidden />

        <div className="flex flex-col gap-5 md:grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1.5fr)_auto] md:items-center md:gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-ink-900 group-hover:text-brand-700 dark:text-ink-50 dark:group-hover:text-brand-300 text-lg font-bold tracking-tight transition-colors md:text-xl">
                {agent.title}
              </h3>
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
                    agent.status === 'pending_approval'
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
            <p
              className={[
                'text-xs font-semibold',
                live
                  ? 'text-emerald-600'
                  : overdue
                    ? 'text-red-600'
                    : behind
                      ? 'text-amber-600'
                      : 'text-ink-400',
              ].join(' ')}
            >
              {live ? 'Live now' : dueLabel(agent.target_go_live)}
            </p>
          </div>
        </div>
      </Link>
    </li>
  )
}
