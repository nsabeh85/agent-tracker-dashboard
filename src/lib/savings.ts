import { isLiveAgent } from './schedule'
import type { Agent, AgentWithStages, SavingsCadence, Stage } from '../types/database'

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
): Array<{ department: string; annual: number; count: number }> {
  const groups = new Map<string, { annual: number; count: number }>()
  for (const agent of agents) {
    const annual = liveAnnualSavings(agent, stages)
    if (annual <= 0) continue
    const current = groups.get(agent.requester_department) ?? { annual: 0, count: 0 }
    current.annual += annual
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
): Array<{ agent: AgentWithStages; annual: number }> {
  return agents
    .map((agent) => ({ agent, annual: liveAnnualSavings(agent, stages) }))
    .filter((row) => row.annual > 0)
    .sort((a, b) => b.annual - a.annual || a.agent.title.localeCompare(b.agent.title))
}
