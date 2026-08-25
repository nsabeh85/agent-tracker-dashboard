import type { Agent, AgentStage, ProgressStatus, Stage } from '../types/database'

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return parseISODate(iso.slice(0, 10)).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function daysUntil(iso: string | null | undefined, today: Date = new Date()): number | null {
  if (!iso) return null
  const target = parseISODate(iso.slice(0, 10))
  return Math.round((target.getTime() - startOfDay(today).getTime()) / 86_400_000)
}

/** Short human phrasing for a target date, e.g. "in 12 days" or "6 days late". */
export function dueLabel(iso: string | null | undefined, today: Date = new Date()): string {
  const days = daysUntil(iso, today)
  if (days === null) return 'No target set'
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days === -1) return '1 day late'
  if (days < 0) return `${Math.abs(days)} days late`
  return `in ${days} days`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function todayISO(date = new Date()): string {
  const local = startOfDay(date)
  const y = local.getFullYear()
  const m = String(local.getMonth() + 1).padStart(2, '0')
  const d = String(local.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** A stage is behind when it is in progress, started, and past expected duration. */
export function isStageBehind(
  stage: Pick<AgentStage, 'status' | 'actual_start' | 'expected_duration_days'>,
  today: Date = new Date(),
): boolean {
  if (stage.status !== 'in_progress' || !stage.actual_start) return false
  const deadline = addDays(parseISODate(stage.actual_start), stage.expected_duration_days)
  return startOfDay(today) > deadline
}

export function liveStage(stages: Stage[]): Stage | undefined {
  return [...stages].sort((a, b) => a.sort_order - b.sort_order).at(-1)
}

export function isPastTargetGoLive(
  agent: Pick<Agent, 'target_go_live' | 'current_stage_id'>,
  stages: Stage[],
  today: Date = new Date(),
): boolean {
  if (!agent.target_go_live) return false
  const live = liveStage(stages)
  const current = stages.find((s) => s.id === agent.current_stage_id)
  if (!live || !current) return false
  if (current.sort_order >= live.sort_order) return false
  return startOfDay(today) > parseISODate(agent.target_go_live)
}

export function isAgentBehind(
  agent: Pick<Agent, 'target_go_live' | 'current_stage_id'>,
  agentStages: Pick<AgentStage, 'status' | 'actual_start' | 'expected_duration_days'>[],
  stages: Stage[],
  today: Date = new Date(),
): boolean {
  if (agentStages.some((stage) => isStageBehind(stage, today))) return true
  return isPastTargetGoLive(agent, stages, today)
}

export function isInFlight(
  agent: Pick<Agent, 'status' | 'current_stage_id'>,
  stages: Stage[],
): boolean {
  if (agent.status !== 'active') return false
  const live = liveStage(stages)
  const current = stages.find((s) => s.id === agent.current_stage_id)
  if (!live || !current) return false
  return current.sort_order < live.sort_order
}

export function isLiveAgent(
  agent: Pick<Agent, 'current_stage_id'>,
  stages: Stage[],
): boolean {
  const live = liveStage(stages)
  return Boolean(live && agent.current_stage_id === live.id)
}

export function createdThisMonth(iso: string, today: Date = new Date()): boolean {
  const created = new Date(iso)
  return (
    created.getFullYear() === today.getFullYear() &&
    created.getMonth() === today.getMonth()
  )
}

export function progressTone(
  stageSortOrder: number,
  currentSortOrder: number,
  agentComplete: boolean,
): 'complete' | 'current' | 'upcoming' {
  if (agentComplete || stageSortOrder < currentSortOrder) return 'complete'
  if (stageSortOrder === currentSortOrder) return 'current'
  return 'upcoming'
}

export function statusLabel(status: ProgressStatus | Agent['status']): string {
  switch (status) {
    case 'not_started':
      return 'Not started'
    case 'in_progress':
      return 'In progress'
    case 'complete':
      return 'Complete'
    case 'blocked':
      return 'Blocked'
    case 'active':
      return 'Active'
    case 'on_hold':
      return 'On hold'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status
  }
}
