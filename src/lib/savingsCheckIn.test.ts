import { describe, expect, it } from 'vitest'
import {
  canUpdateLiveSavings,
  completedLiveMonths,
  dueSavingsCheckpoint,
  savingsCheckInMessage,
  savingsDashboardAlert,
  savingsReminderLabel,
  tenureLabel,
} from './savingsCheckIn'
import type { AgentWithStages, Stage } from '../types/database'

const stages: Stage[] = [
  { id: 'build', name: 'Build', sort_order: 1, default_duration_days: 10 },
  { id: 'live', name: 'Live', sort_order: 2, default_duration_days: 30 },
]

function agent(overrides: Partial<AgentWithStages> = {}): AgentWithStages {
  return {
    id: 'agent-1',
    title: 'Due Diligence Agent',
    requester_name: 'Example',
    requester_department: 'Legal',
    description: '',
    priority: 'medium',
    current_stage_id: 'live',
    target_go_live: '2026-01-01',
    assigned_to: 'Example Owner',
    status: 'active',
    source_url: null,
    public_token: 'a'.repeat(32),
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    savings_amount: null,
    savings_cadence: 'yearly',
    went_live_on: '2026-01-01',
    copilot_studio_url: null,
    agent_owners: [],
    agent_stages: [
      {
        id: 'stage-row',
        agent_id: 'agent-1',
        stage_id: 'live',
        status: 'in_progress',
        expected_duration_days: 30,
        actual_start: '2026-01-01',
        actual_end: null,
        agent_stage_owners: [],
      },
    ],
    ...overrides,
  }
}

function liveOn(iso: string): AgentWithStages {
  const row = agent()
  row.target_go_live = iso
  row.went_live_on = iso
  row.agent_stages = row.agent_stages.map((stage) => ({ ...stage, actual_start: iso }))
  return row
}

describe('production cost check-ins', () => {
  it('counts calendar months from the live day', () => {
    expect(completedLiveMonths('2026-10-10', new Date(2026, 9, 10))).toBe(0)
    expect(completedLiveMonths('2026-10-10', new Date(2026, 10, 9))).toBe(0)
    expect(completedLiveMonths('2026-10-10', new Date(2026, 10, 10))).toBe(1)
    expect(completedLiveMonths('2026-10-10', new Date(2026, 11, 10))).toBe(2)
    expect(completedLiveMonths('2026-10-10', new Date(2027, 0, 10))).toBe(3)
    expect(completedLiveMonths('2026-10-10', new Date(2027, 9, 9))).toBe(11)
    expect(completedLiveMonths('2026-10-10', new Date(2027, 9, 10))).toBe(12)
    expect(completedLiveMonths('2026-10-10', new Date(2027, 10, 10))).toBe(13)
    expect(completedLiveMonths(null)).toBe(0)
  })

  it('uses the last day when the live day does not exist in that month', () => {
    expect(completedLiveMonths('2026-01-31', new Date(2026, 1, 27))).toBe(0)
    expect(completedLiveMonths('2026-01-31', new Date(2026, 1, 28))).toBe(1)
    expect(completedLiveMonths('2026-01-31', new Date(2026, 2, 30))).toBe(1)
    expect(completedLiveMonths('2026-01-31', new Date(2026, 2, 31))).toBe(2)
    expect(completedLiveMonths('2028-01-31', new Date(2028, 1, 28))).toBe(0)
    expect(completedLiveMonths('2028-01-31', new Date(2028, 1, 29))).toBe(1)
  })

  it('asks once for the latest month and skips agents that are not live', () => {
    const today = new Date(2026, 2, 17)
    expect(dueSavingsCheckpoint(agent(), stages, [], today)).toBe(2)
    expect(dueSavingsCheckpoint(agent(), stages, [2], today)).toBeNull()
    expect(dueSavingsCheckpoint(agent({ status: 'on_hold' }), stages, [], today)).toBe(2)
    expect(dueSavingsCheckpoint(agent({ status: 'complete' }), stages, [], today)).toBeNull()
    expect(dueSavingsCheckpoint(agent({ status: 'cancelled' }), stages, [], today)).toBeNull()
    expect(dueSavingsCheckpoint(agent({ current_stage_id: 'build' }), stages, [], today)).toBeNull()
  })

  it('lets Justin or Ajay update the cost saved', () => {
    expect(canUpdateLiveSavings('JTaylor@DigitalRealty.com')).toBe(true)
    expect(canUpdateLiveSavings('ASudra@DigitalRealty.com')).toBe(true)
    expect(canUpdateLiveSavings('llawhon@digitalrealty.com')).toBe(false)
    expect(canUpdateLiveSavings(null)).toBe(false)
  })

  it('names months and years together', () => {
    expect(tenureLabel(0)).toBeNull()
    expect(tenureLabel(1)).toBe('one month')
    expect(tenureLabel(2)).toBe('two months')
    expect(tenureLabel(3)).toBe('three months')
    expect(tenureLabel(11)).toBe('eleven months')
    expect(tenureLabel(12)).toBe('one year')
    expect(tenureLabel(13)).toBe('one year and one month')
    expect(tenureLabel(14)).toBe('one year and two months')
    expect(tenureLabel(24)).toBe('two years')
    expect(tenureLabel(27)).toBe('two years and three months')
  })

  it('flags the same calendar day each month', () => {
    const live = liveOn('2026-10-10')
    expect(savingsReminderLabel(live, stages, new Date(2026, 10, 9))).toBeNull()
    expect(savingsReminderLabel(live, stages, new Date(2026, 10, 10))).toBe('one month')
    expect(savingsReminderLabel(live, stages, new Date(2026, 11, 10))).toBe('two months')
    expect(savingsReminderLabel(live, stages, new Date(2027, 0, 10))).toBe('three months')
    expect(savingsReminderLabel(live, stages, new Date(2027, 9, 10))).toBe('one year')
    expect(savingsReminderLabel(live, stages, new Date(2027, 10, 10))).toBe('one year and one month')
    expect(savingsReminderLabel(agent({ status: 'complete' }), stages, new Date(2027, 0, 10))).toBeNull()
    expect(savingsReminderLabel(agent({ current_stage_id: 'build' }), stages, new Date(2027, 0, 10))).toBeNull()
  })

  it('uses the recorded went-live date and ignores the target date', () => {
    const recorded = agent({
      went_live_on: '2026-10-10',
      target_go_live: '2026-01-01',
      agent_stages: agent().agent_stages.map((stage) => ({ ...stage, actual_start: null })),
    })
    const unrecorded = agent({
      went_live_on: null,
      target_go_live: '2026-01-01',
      agent_stages: agent().agent_stages.map((stage) => ({
        ...stage,
        actual_start: null,
        actual_end: null,
      })),
    })

    expect(savingsReminderLabel(recorded, stages, new Date(2026, 10, 10))).toBe('one month')
    expect(savingsReminderLabel(unrecorded, stages, new Date(2026, 10, 10))).toBeNull()
  })

  it('asks for the cost saved on the dashboard', () => {
    expect(savingsDashboardAlert('Due Diligence Agent', 'one month')).toBe(
      'Due Diligence Agent has been live for one month, please enter cost saved.',
    )
    expect(savingsDashboardAlert('Due Diligence Agent', 'one year and one month')).toBe(
      'Due Diligence Agent has been live for one year and one month, please enter cost saved.',
    )
  })

  it('asks Justin how the agent is doing and where to update the cost', () => {
    const message = savingsCheckInMessage('Due Diligence Agent', 13, 'https://tracker.example/agents/1')
    expect(message.subject).toBe('Due Diligence Agent has been live for one year and one month')
    expect(message.text).toContain('what do you think you have saved')
    expect(message.text).toContain('https://tracker.example/agents/1')
  })
})
