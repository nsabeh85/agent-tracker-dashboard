import {
  createdThisMonth,
  isAgentBehind,
  isInFlight,
  isLiveAgent,
} from './schedule'
import type { AgentPriority, AgentWithStages, Stage } from '../types/database'

export type DashboardMetric = 'pending' | 'in_flight' | 'live' | 'behind' | 'this_month'
export type DashboardSort = 'target' | 'priority' | 'updated'

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
  switch (metric) {
    case 'pending':
      return agent.status === 'pending_approval'
    case 'in_flight':
      return isInFlight(agent, stages)
    case 'live':
      return isLiveAgent(agent, stages)
    case 'behind':
      return isAgentBehind(agent, agent.agent_stages, stages, today)
    case 'this_month':
      return createdThisMonth(agent.created_at, today)
  }
}
