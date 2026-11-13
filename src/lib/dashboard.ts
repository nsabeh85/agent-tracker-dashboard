import {
  createdThisMonth,
  isAgentBehind,
  isInFlight,
  isLiveAgent,
  isPastTargetGoLive,
} from './schedule'
import type { AgentPriority, AgentStatus, AgentWithStages, Stage } from '../types/database'

export type DashboardMetric = 'pending' | 'in_flight' | 'live' | 'behind' | 'on_hold' | 'this_month'
export type DashboardSort = 'target' | 'priority' | 'updated'
export type StatusFilter = 'board' | 'pending_approval' | 'active' | 'on_hold' | 'backlog'

/** Legacy single-select helper. The board list uses matchesBoardFilters. */
export function isShownOnDashboard(
  status: AgentStatus,
  filter: StatusFilter,
): boolean {
  if (filter === 'board') return status !== 'backlog'
  return status === filter
}

export type BoardFilters = {
  stageIds: string[]
  owners: string[]
  departments: string[]
  statuses: AgentStatus[]
}

/** Empty selections mean every value, including backlog. */
export function matchesBoardFilters(agent: AgentWithStages, filters: BoardFilters): boolean {
  if (filters.stageIds.length > 0 && !filters.stageIds.includes(agent.current_stage_id)) {
    return false
  }
  if (
    filters.departments.length > 0 &&
    !filters.departments.includes(agent.requester_department)
  ) {
    return false
  }
  if (filters.owners.length > 0) {
    const names = agent.agent_owners.map((assignment) => assignment.owner.full_name)
    const assigned = names.length > 0 ? names : [agent.assigned_to]
    if (!filters.owners.some((name) => assigned.includes(name))) return false
  }
  if (filters.statuses.length > 0) return filters.statuses.includes(agent.status)
  return true
}

export type LeftBarTone = 'hold' | 'blocked' | 'overdue' | 'behind' | 'live' | 'default'

/** On hold and blocked use the same red bar. Live stays green. */
export function leftBarTone(
  agent: AgentWithStages,
  stages: Stage[],
  today: Date = new Date(),
): LeftBarTone {
  if (agent.status === 'on_hold') return 'hold'
  const current = agent.agent_stages.find((stage) => stage.stage_id === agent.current_stage_id)
  if (current?.status === 'blocked') return 'blocked'
  if (isPastTargetGoLive(agent, stages, today)) return 'overdue'
  if (isAgentBehind(agent, agent.agent_stages, stages, today)) return 'behind'
  if (isLiveAgent(agent, stages)) return 'live'
  return 'default'
}

const PRIORITY_RANK: Record<AgentPriority, number> = { high: 0, medium: 1, low: 2 }

export function compareAgents(
  a: AgentWithStages,
  b: AgentWithStages,
  sort: DashboardSort,
): number {
  if (sort === 'priority') {
    const priorityDifference = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (priorityDifference !== 0) return priorityDifference
  }
  if (sort === 'updated') return b.updated_at.localeCompare(a.updated_at)
  const aDate = a.target_go_live ?? '9999-12-31'
  const bDate = b.target_go_live ?? '9999-12-31'
  return aDate.localeCompare(bDate)
}

export function matchesDashboardMetric(
  agent: AgentWithStages,
  stages: Stage[],
  metric: DashboardMetric,
  today: Date = new Date(),
): boolean {
  if (agent.status === 'backlog') return false
  switch (metric) {
    case 'pending':
      return agent.status === 'pending_approval'
    case 'in_flight':
      return isInFlight(agent, stages)
    case 'live':
      return agent.status !== 'on_hold' && isLiveAgent(agent, stages)
    case 'behind':
      return isAgentBehind(agent, agent.agent_stages, stages, today)
    case 'on_hold':
      return agent.status === 'on_hold'
    case 'this_month':
      return createdThisMonth(agent.created_at, today)
  }
}
