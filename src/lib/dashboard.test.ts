import { describe, expect, it } from 'vitest'
import {
  compareAgents,
  isShownOnDashboard,
  leftBarTone,
  matchesBoardFilters,
  matchesDashboardMetric,
} from './dashboard'
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
    savings_amount: null,
    savings_cadence: 'yearly',
    went_live_on: stageId === 'live' ? stageStarted : null,
    approval_package_url: null,
    confluence_url: null,
    copilot_studio_url: null,
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
    expect(
      matchesDashboardMetric(
        agent({ id: 'parked', status: 'backlog', createdAt: '2026-09-03T12:00:00Z' }),
        stages,
        'this_month',
        today,
      ),
    ).toBe(false)
    expect(
      matchesDashboardMetric(agent({ id: 'paused', status: 'on_hold' }), stages, 'on_hold', today),
    ).toBe(true)
    expect(
      matchesDashboardMetric(
        agent({ id: 'paused-live', status: 'on_hold', stageId: 'live' }),
        stages,
        'live',
        today,
      ),
    ).toBe(false)
    expect(
      matchesDashboardMetric(
        agent({ id: 'paused-late', status: 'on_hold', stageStarted: '2026-08-01' }),
        stages,
        'behind',
        today,
      ),
    ).toBe(false)
  })
})

describe('dashboard backlog', () => {
  it('keeps every status except backlog on the default board', () => {
    expect(isShownOnDashboard('pending_approval', 'board')).toBe(true)
    expect(isShownOnDashboard('active', 'board')).toBe(true)
    expect(isShownOnDashboard('on_hold', 'board')).toBe(true)
    expect(isShownOnDashboard('backlog', 'board')).toBe(false)
  })

  it('shows backlog only when that filter is selected', () => {
    expect(isShownOnDashboard('backlog', 'backlog')).toBe(true)
    expect(isShownOnDashboard('active', 'backlog')).toBe(false)
    expect(isShownOnDashboard('on_hold', 'on_hold')).toBe(true)
    expect(isShownOnDashboard('active', 'on_hold')).toBe(false)
  })
})

describe('dashboard multi-select filters', () => {
  const filters = { stageIds: [], owners: [], departments: [], statuses: [] as AgentStatus[] }

  it('includes backlog when no status is selected', () => {
    expect(matchesBoardFilters(agent({ id: 'parked', status: 'backlog' }), filters)).toBe(true)
    expect(
      matchesBoardFilters(agent({ id: 'parked', status: 'backlog' }), {
        ...filters,
        statuses: ['active'],
      }),
    ).toBe(false)
    expect(
      matchesBoardFilters(agent({ id: 'parked', status: 'backlog' }), {
        ...filters,
        statuses: ['backlog'],
      }),
    ).toBe(true)
  })

  it('keeps an agent when any selected stage, owner, or department matches', () => {
    const row = agent({ id: 'finance', stageId: 'requested' })
    row.requester_department = 'Finance'
    row.agent_owners = [
      {
        owner_id: 'owner-1',
        owner: {
          id: 'owner-1',
          full_name: 'Mark Seay',
          active: true,
          created_at: '2026-08-01T12:00:00Z',
          sort_order: 1,
        },
      },
    ]
    expect(matchesBoardFilters(row, { ...filters, stageIds: ['live', 'requested'] })).toBe(true)
    expect(matchesBoardFilters(row, { ...filters, stageIds: ['live'] })).toBe(false)
    expect(matchesBoardFilters(row, { ...filters, owners: ['Mark Seay', 'Nabih Sabeh'] })).toBe(
      true,
    )
    expect(matchesBoardFilters(row, { ...filters, departments: ['Finance', 'Legal'] })).toBe(true)
    expect(matchesBoardFilters(row, { ...filters, departments: ['Legal'] })).toBe(false)
  })
})

describe('dashboard left bar', () => {
  const today = new Date('2026-10-21T12:00:00Z')

  it('uses red for on hold and for a blocked current stage', () => {
    expect(leftBarTone(agent({ id: 'paused', status: 'on_hold' }), stages, today)).toBe('hold')
    const blocked = agent({ id: 'stuck' })
    blocked.agent_stages[0].status = 'blocked'
    expect(leftBarTone(blocked, stages, today)).toBe('blocked')
  })

  it('keeps a live agent green', () => {
    expect(
      leftBarTone(
        agent({ id: 'shipped', stageId: 'live', target: '2026-12-01' }),
        stages,
        today,
      ),
    ).toBe('live')
  })
})
