import { isLiveAgent, liveStage, parseISODate, startOfDay, todayISO } from './schedule'
import type { Agent, AgentStage, AgentWithStages, SavingsCadence, Stage } from '../types/database'

export function parseSavingsAmount(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const amount = Number(trimmed.replace(/,/g, ''))
  if (!Number.isFinite(amount) || amount < 0) return 'invalid'
  return Math.round(amount * 100) / 100
}

/** Convert a stored estimate to a yearly figure so mixed cadences can be summed. */
export function annualizedSavings(
  amount: number | null | undefined,
  cadence: SavingsCadence | null | undefined,
): number {
  if (amount == null || amount <= 0) return 0
  return cadence === 'monthly' ? amount * 12 : amount
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount >= 1000 && Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

export function savingsLabel(
  amount: number | null | undefined,
  cadence: SavingsCadence | null | undefined,
): string | null {
  if (amount == null) return null
  return `${formatUsd(amount)} / ${cadence === 'monthly' ? 'mo' : 'yr'}`
}

export function monthlySavingsRate(
  amount: number | null | undefined,
  cadence: SavingsCadence | null | undefined,
): number {
  if (amount == null || amount <= 0) return 0
  return cadence === 'monthly' ? amount : amount / 12
}

/** Calendar months from the live start through today, including the starting month. */
export function monthsInService(
  startISO: string | null | undefined,
  today: Date = new Date(),
): number {
  if (!startISO) return 0
  const start = startOfDay(parseISODate(startISO.slice(0, 10)))
  const now = startOfDay(today)
  if (now < start) return 0
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1
}

export function liveSinceISO(
  agent: Pick<Agent, 'target_go_live' | 'current_stage_id'>,
  agentStages: Array<Pick<AgentStage, 'stage_id' | 'actual_start' | 'actual_end'>>,
  stages: Stage[],
  today: Date = new Date(),
): string | null {
  if (!isLiveAgent(agent, stages)) return null
  const live = liveStage(stages)
  const liveRow = agentStages.find((row) => row.stage_id === live?.id)
  if (liveRow?.actual_start) return liveRow.actual_start.slice(0, 10)
  const prior = [...agentStages]
    .map((row) => ({ row, stage: stages.find((stage) => stage.id === row.stage_id) }))
    .filter(
      (entry): entry is { row: (typeof agentStages)[number]; stage: Stage } =>
        Boolean(entry.stage && live && entry.stage.sort_order < live.sort_order),
    )
    .sort((a, b) => b.stage.sort_order - a.stage.sort_order)[0]
  if (prior?.row.actual_end) return prior.row.actual_end.slice(0, 10)
  if (agent.target_go_live) return agent.target_go_live.slice(0, 10)
  return todayISO(today)
}

/** Months live × the monthly rate. Not a full-year projection. */
export function realizedSavings(
  amount: number | null | undefined,
  cadence: SavingsCadence | null | undefined,
  liveSince: string | null | undefined,
  today: Date = new Date(),
): number {
  const months = monthsInService(liveSince, today)
  if (months <= 0) return 0
  return Math.round(monthlySavingsRate(amount, cadence) * months * 100) / 100
}

export function liveRealizedSavings(
  agent: Pick<Agent, 'savings_amount' | 'savings_cadence' | 'current_stage_id' | 'target_go_live'> & {
    agent_stages: Array<Pick<AgentStage, 'stage_id' | 'actual_start' | 'actual_end'>>
  },
  stages: Stage[],
  today: Date = new Date(),
): number {
  if (!isLiveAgent(agent, stages)) return 0
  return realizedSavings(
    agent.savings_amount,
    agent.savings_cadence,
    liveSinceISO(agent, agent.agent_stages, stages, today),
    today,
  )
}

export function totalLiveRealizedSavings(
  agents: AgentWithStages[],
  stages: Stage[],
  today: Date = new Date(),
): number {
  return agents.reduce((sum, agent) => sum + liveRealizedSavings(agent, stages, today), 0)
}
export function liveAnnualSavings(
  agent: Pick<Agent, 'savings_amount' | 'savings_cadence' | 'current_stage_id'>,
  stages: Stage[],
): number {
  if (!isLiveAgent(agent, stages)) return 0
  return annualizedSavings(agent.savings_amount, agent.savings_cadence)
}

export function totalLiveAnnualSavings(agents: AgentWithStages[], stages: Stage[]): number {
  return agents.reduce((sum, agent) => sum + liveAnnualSavings(agent, stages), 0)
}

export function savingsByDepartment(
  agents: AgentWithStages[],
  stages: Stage[],
  today: Date = new Date(),
): Array<{ department: string; annual: number; realized: number; count: number }> {
  const groups = new Map<string, { annual: number; realized: number; count: number }>()
  for (const agent of agents) {
    const annual = liveAnnualSavings(agent, stages)
    const realized = liveRealizedSavings(agent, stages, today)
    if (annual <= 0 && realized <= 0) continue
    const current = groups.get(agent.requester_department) ?? { annual: 0, realized: 0, count: 0 }
    current.annual += annual
    current.realized += realized
    current.count += 1
    groups.set(agent.requester_department, current)
  }
  return [...groups.entries()]
    .map(([department, value]) => ({ department, ...value }))
    .sort((a, b) => b.annual - a.annual || a.department.localeCompare(b.department))
}

export function liveAgentsWithSavings(
  agents: AgentWithStages[],
  stages: Stage[],
  today: Date = new Date(),
): Array<{ agent: AgentWithStages; annual: number; realized: number }> {
  return agents
    .map((agent) => ({
      agent,
      annual: liveAnnualSavings(agent, stages),
      realized: liveRealizedSavings(agent, stages, today),
    }))
    .filter((row) => row.annual > 0 || row.realized > 0)
    .sort((a, b) => b.annual - a.annual || a.agent.title.localeCompare(b.agent.title))
}
