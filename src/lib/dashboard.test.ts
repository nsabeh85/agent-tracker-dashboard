import { describe, expect, it } from 'vitest'
import { compareAgents, matchesDashboardMetric } from './dashboard'
import type { AgentPriority, AgentStatus, AgentWithStages, Stage } from '../types/database'

const stages: Stage[] = [
  { id: 'requested', name: 'Requested', sort_order: 1, default_duration_days: 5 },
  { id: 'live', name: 'Live', sort_order: 2, default_duration_days: 30 },
]

function agent({
  id,
  priority = 'medium',
  status = 'active',
  stageId = 'requested',
  createdAt = '2026-08-01T12:00:00Z',
  target = '2026-10-01',
  stageStarted = '2026-09-01',
}: {
  id: string
  priority?: AgentPriority
  status?: AgentStatus
  stageId?: string
  createdAt?: string
  target?: string | null
  stageStarted?: string | null
}): AgentWithStages {
  return {
    id,
    title: id,
    requester_name: 'Example Requester',
    requester_department: 'Example',
    description: '',
    priority,
    current_stage_id: stageId,
    target_go_live: target,
    assigned_to: 'Example Owner',
    status,
    source_url: null,
    public_token: 'a'.repeat(32),
    created_at: createdAt,
    updated_at: createdAt,
    agent_owners: [],
    agent_stages: [
      {
        id: `${id}-stage`,
        agent_id: id,
        stage_id: stageId,
        expected_duration_days: 5,
        actual_start: stageStarted,
        actual_end: null,
        status: stageId === 'live' ? 'complete' : 'in_progress',
        agent_stage_owners: [],
      },
    ],
  }
}

describe('dashboard ordering', () => {
  it('orders high, medium, then low priority by default', () => {
    const agents = [
      agent({ id: 'low', priority: 'low' }),
      agent({ id: 'high', priority: 'high' }),
      agent({ id: 'medium', priority: 'medium' }),
    ]

    expect(agents.sort((a, b) => compareAgents(a, b, 'priority')).map((row) => row.id)).toEqual([
      'high',
      'medium',
      'low',
    ])
  })

  it('uses target date to order agents with equal priority', () => {
    const later = agent({ id: 'later', priority: 'high', target: '2026-11-01' })
    const sooner = agent({ id: 'sooner', priority: 'high', target: '2026-10-01' })

    expect([later, sooner].sort((a, b) => compareAgents(a, b, 'priority'))[0].id).toBe('sooner')
  })
})

describe('dashboard summary filters', () => {
  const today = new Date('2026-09-08T12:00:00')

  it('matches pending, in-flight, live, behind, and this-month agents', () => {
    expect(
      matchesDashboardMetric(
        agent({ id: 'pending', status: 'pending_approval' }),
        stages,
        'pending',
        today,
      ),
    ).toBe(true)
    expect(matchesDashboardMetric(agent({ id: 'flight' }), stages, 'in_flight', today)).toBe(true)
    expect(
      matchesDashboardMetric(agent({ id: 'live', stageId: 'live' }), stages, 'live', today),
    ).toBe(true)
    expect(
      matchesDashboardMetric(
        agent({ id: 'behind', stageStarted: '2026-08-01' }),
        stages,
        'behind',
        today,
      ),
    ).toBe(true)
    expect(
      matchesDashboardMetric(
        agent({ id: 'month', createdAt: '2026-09-03T12:00:00Z' }),
        stages,
        'this_month',
        today,
      ),
    ).toBe(true)
  })
})
