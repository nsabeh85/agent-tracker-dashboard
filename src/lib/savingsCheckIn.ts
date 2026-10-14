import { liveSinceISO } from './savings'
import { isLiveAgent, parseISODate, startOfDay } from './schedule'
import type { Agent, AgentStage, Stage } from '../types/database'

export const SAVINGS_PRIMARY_EMAIL = 'jtaylor@digitalrealty.com'
export const SAVINGS_SECONDARY_EMAIL = 'asudra@digitalrealty.com'
export const SAVINGS_FROM_EMAIL = 'llawhon@digitalrealty.com'

const SAVINGS_EDITOR_EMAILS = [SAVINGS_PRIMARY_EMAIL, SAVINGS_SECONDARY_EMAIL]

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

export function canUpdateLiveSavings(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase()
  return normalized != null && SAVINGS_EDITOR_EMAILS.includes(normalized)
}

type CheckInAgent = Pick<Agent, 'status' | 'current_stage_id' | 'target_go_live'> & {
  agent_stages: Array<Pick<AgentStage, 'stage_id' | 'actual_start' | 'actual_end'>>
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function numberWords(value: number): string {
  if (value < 20) return ONES[value] ?? String(value)
  if (value < 100) {
    const tens = Math.floor(value / 10)
    const ones = value % 10
    return ones === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[ones]}`
  }
  return String(value)
}

/**
 * Completed calendar months since the agent went live.
 * The mark is the same day of the month. A shorter month uses its last day,
 * so January 31 is due again on February 28, or February 29 in a leap year.
 */
export function completedLiveMonths(liveSince: string | null | undefined, today: Date = new Date()): number {
  if (!liveSince) return 0
  const start = parseISODate(liveSince.slice(0, 10))
  const now = startOfDay(today)
  if (now < start) return 0
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  const anniversaryDay = Math.min(start.getDate(), daysInMonth(now.getFullYear(), now.getMonth()))
  if (now.getDate() < anniversaryDay) months -= 1
  return months > 0 ? months : 0
}

/** "one month", "eleven months", "one year", "one year and one month", "two years and three months". */
export function tenureLabel(months: number): string | null {
  if (months < 1) return null
  const years = Math.floor(months / 12)
  const remainder = months % 12
  const yearPart =
    years === 0 ? null : years === 1 ? 'one year' : `${numberWords(years)} years`
  const monthPart =
    remainder === 0 ? null : remainder === 1 ? 'one month' : `${numberWords(remainder)} months`
  if (yearPart && monthPart) return `${yearPart} and ${monthPart}`
  return yearPart ?? monthPart
}

/** Latest monthly anniversary already reached, or null before the first one. */
export function savingsReminderLabel(
  agent: CheckInAgent,
  stages: Stage[],
  today: Date = new Date(),
): string | null {
  if (!isLiveAgent(agent, stages)) return null
  if (agent.status === 'complete' || agent.status === 'cancelled') return null
  const months = completedLiveMonths(liveSinceISO(agent, agent.agent_stages, stages, today), today)
  return tenureLabel(months)
}

export function savingsDashboardAlert(title: string, periodLabel: string): string {
  return `${title} has been live for ${periodLabel}, please enter cost saved.`
}

/**
 * One prompt per completed calendar month. A missed month is covered by the
 * latest mark, so two months and ten days asks for two months once.
 */
export function dueSavingsCheckpoint(
  agent: CheckInAgent,
  stages: Stage[],
  sentPeriods: number[],
  today: Date = new Date(),
): number | null {
  if (!isLiveAgent(agent, stages)) return null
  if (agent.status === 'complete' || agent.status === 'cancelled') return null
  const months = completedLiveMonths(liveSinceISO(agent, agent.agent_stages, stages, today), today)
  if (months < 1 || sentPeriods.includes(months)) return null
  return months
}

export function savingsCheckInMessage(title: string, monthsLive: number, boardUrl: string): {
  subject: string
  text: string
} {
  const period = tenureLabel(monthsLive) ?? `${monthsLive} months`
  return {
    subject: `${title} has been live for ${period}`,
    text: [
      `${title} has been live for ${period}. How is it going, and what do you think you have saved by using this agent?`,
      '',
      'Update Cost saved on the board:',
      boardUrl,
    ].join('\n'),
  }
}
