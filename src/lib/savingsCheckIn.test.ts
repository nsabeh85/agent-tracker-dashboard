import { describe, expect, it } from 'vitest'
import {
  daysInProduction,
  dueSavingsCheckpoint,
  savingsCheckInMessage,
  savingsCheckpoint,
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

describe('production cost check-ins', () => {
  it('counts whole days from the live start', () => {
    expect(daysInProduction('2026-01-01', new Date(2026, 0, 1))).toBe(0)
    expect(daysInProduction('2026-01-01', new Date(2026, 0, 31))).toBe(30)
    expect(daysInProduction(null)).toBe(0)
  })

  it('lands on day 30, 60, and 90', () => {
    expect(savingsCheckpoint(29)).toBeNull()
    expect(savingsCheckpoint(30)).toBe(30)
    expect(savingsCheckpoint(59)).toBe(30)
    expect(savingsCheckpoint(90)).toBe(90)
  })

  it('asks once for the latest mark and skips agents that are not live', () => {
    const today = new Date(2026, 2, 17)
    expect(dueSavingsCheckpoint(agent(), stages, [], today)).toBe(60)
    expect(dueSavingsCheckpoint(agent(), stages, [60], today)).toBeNull()
    expect(dueSavingsCheckpoint(agent({ status: 'complete' }), stages, [], today)).toBeNull()
    expect(dueSavingsCheckpoint(agent({ current_stage_id: 'build' }), stages, [], today)).toBeNull()
  })

  it('asks Justin how the agent is doing and where to update the cost', () => {
    const message = savingsCheckInMessage('Due Diligence Agent', 30, 'https://tracker.example/agents/1')
    expect(message.subject).toBe('Due Diligence Agent has been live 30 days')
    expect(message.text).toContain('what do you think you have saved')
    expect(message.text).toContain('https://tracker.example/agents/1')
  })
})
