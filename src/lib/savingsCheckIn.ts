import { liveSinceISO } from './savings'
import { isLiveAgent, parseISODate, startOfDay } from './schedule'
import type { Agent, AgentStage, Stage } from '../types/database'

export const SAVINGS_CHECKIN_DAYS = 30
export const SAVINGS_PRIMARY_EMAIL = 'jtaylor@digitalrealty.com'
export const SAVINGS_SECONDARY_EMAIL = 'asudra@digitalrealty.com'

export function canUpdateLiveSavings(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === SAVINGS_PRIMARY_EMAIL
}

type CheckInAgent = Pick<Agent, 'status' | 'current_stage_id' | 'target_go_live'> & {
  agent_stages: Array<Pick<AgentStage, 'stage_id' | 'actual_start' | 'actual_end'>>
}

/** Whole days since the agent entered production. Day 0 is the live start date. */
export function daysInProduction(liveSince: string | null | undefined, today: Date = new Date()): number {
  if (!liveSince) return 0
  const start = parseISODate(liveSince.slice(0, 10))
  const now = startOfDay(today)
  const days = Math.round(
    (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
      Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
      86_400_000,
  )
  return days > 0 ? days : 0
}

/** The latest 30-day mark already reached, or null before day 30. */
export function savingsCheckpoint(daysLive: number): number | null {
  if (daysLive < SAVINGS_CHECKIN_DAYS) return null
  return Math.floor(daysLive / SAVINGS_CHECKIN_DAYS) * SAVINGS_CHECKIN_DAYS
}

/**
 * One prompt per 30 days in production. A missed month is covered by the
 * latest mark, so day 75 sends the 60-day note once, then the next is day 90.
 */
export function dueSavingsCheckpoint(
  agent: CheckInAgent,
  stages: Stage[],
  sentPeriods: number[],
  today: Date = new Date(),
): number | null {
  if (!isLiveAgent(agent, stages)) return null
  if (agent.status === 'complete' || agent.status === 'cancelled') return null
  const checkpoint = savingsCheckpoint(
    daysInProduction(liveSinceISO(agent, agent.agent_stages, stages, today), today),
  )
  if (checkpoint == null || sentPeriods.includes(checkpoint)) return null
  return checkpoint
}

export function savingsCheckInMessage(title: string, periodDays: number, boardUrl: string): {
  subject: string
  text: string
} {
  return {
    subject: `${title} has been live ${periodDays} days`,
    text: [
      `${title} has been live for ${periodDays} days. How is it going, and what do you think you have saved by using this agent?`,
      '',
      'Update Cost saved on the board:',
      boardUrl,
    ].join('\n'),
  }
}
