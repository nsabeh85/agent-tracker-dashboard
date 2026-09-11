import { describe, expect, it } from 'vitest'
import {
  annualizedSavings,
  liveAgentsWithSavings,
  liveRealizedSavings,
  monthsInService,
  parseSavingsAmount,
  realizedSavings,
  savingsByDepartment,
  savingsLabel,
  totalLiveAnnualSavings,
  totalLiveRealizedSavings,
} from './savings'
import type { AgentWithStages, Stage } from '../types/database'

const stages: Stage[] = [
  { id: 'requested', name: 'Requested', sort_order: 1, default_duration_days: 5 },
  { id: 'live', name: 'Live', sort_order: 2, default_duration_days: 30 },
]

function agent({
  id,
  department = 'Legal',
  amount = null,
  cadence = 'yearly',
  stageId = 'live',
  liveStart = '2026-01-15',
}: {
  id: string
  department?: string
  amount?: number | null
  cadence?: 'monthly' | 'yearly'
  stageId?: string
  liveStart?: string | null
}): AgentWithStages {
  return {
    id,
    title: id,
    requester_name: 'Example',
    requester_department: department,
    description: '',
    priority: 'medium',
    current_stage_id: stageId,
    target_go_live: liveStart,
    assigned_to: 'Nabih Sabeh',
    status: 'active',
    source_url: null,
    public_token: 'a'.repeat(32),
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    savings_amount: amount,
    savings_cadence: cadence,
    copilot_studio_url: null,
    agent_owners: [],
    agent_stages: liveStart
      ? [
          {
            id: `${id}-live-stage`,
            agent_id: id,
            stage_id: 'live',
            status: 'in_progress',
            expected_duration_days: 30,
            actual_start: liveStart,
            actual_end: null,
            agent_stage_owners: [],
          },
        ]
      : [],
  }
}

describe('savings math', () => {
  it('parses blank, valid, and invalid amounts', () => {
    expect(parseSavingsAmount('')).toBeNull()
    expect(parseSavingsAmount(' 1,200.5 ')).toBe(1200.5)
    expect(parseSavingsAmount('-1')).toBe('invalid')
    expect(parseSavingsAmount('abc')).toBe('invalid')
  })

  it('annualizes monthly estimates and leaves yearly estimates unchanged', () => {
    expect(annualizedSavings(1000, 'monthly')).toBe(12000)
    expect(annualizedSavings(50000, 'yearly')).toBe(50000)
    expect(annualizedSavings(null, 'monthly')).toBe(0)
  })

  it('formats entered cadence without inventing a yearly label', () => {
    expect(savingsLabel(1000, 'monthly')).toMatch(/\/ mo$/)
    expect(savingsLabel(null, 'yearly')).toBeNull()
  })

  it('sums only live agents and groups them by department', () => {
    const agents = [
      agent({ id: 'legal-a', department: 'Legal', amount: 1000, cadence: 'monthly' }),
      agent({ id: 'legal-b', department: 'Legal', amount: 6000, cadence: 'yearly' }),
      agent({ id: 'data', department: 'Data', amount: 24000, cadence: 'yearly' }),
      agent({
        id: 'not-live',
        department: 'Legal',
        amount: 999999,
        cadence: 'yearly',
        stageId: 'requested',
      }),
    ]

    expect(totalLiveAnnualSavings(agents, stages)).toBe(42000)
    expect(savingsByDepartment(agents, stages).map((row) => [row.department, row.annual])).toEqual([
      ['Data', 24000],
      ['Legal', 18000],
    ])
    expect(liveAgentsWithSavings(agents, stages).map((row) => row.agent.id)).toEqual([
      'data',
      'legal-a',
      'legal-b',
    ])
  })

  it('counts realized savings as each month live, not a full-year projection', () => {
    const today = new Date(2026, 2, 15)
    expect(monthsInService('2026-01-15', today)).toBe(3)
    expect(realizedSavings(1000, 'monthly', '2026-01-15', today)).toBe(3000)
    expect(realizedSavings(12000, 'yearly', '2026-01-15', today)).toBe(3000)
    expect(realizedSavings(1000, 'monthly', '2026-03-15', today)).toBe(1000)

    const monthly = agent({
      id: 'legal-a',
      amount: 1000,
      cadence: 'monthly',
      liveStart: '2026-01-15',
    })
    expect(liveRealizedSavings(monthly, stages, today)).toBe(3000)
    expect(totalLiveRealizedSavings([monthly], stages, today)).toBe(3000)
  })
})
