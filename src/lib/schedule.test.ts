import { describe, expect, it } from 'vitest'
import {
  addDays,
  createdThisMonth,
  daysUntil,
  dueLabel,
  initials,
  isAgentBehind,
  isInFlight,
  isPastTargetGoLive,
  isStageBehind,
  parseISODate,
} from './schedule'
import type { Stage } from '../types/database'

const stages: Stage[] = [
  { id: 's1', name: 'Requested', sort_order: 1, default_duration_days: 5 },
  { id: 's2', name: 'Scoping', sort_order: 2, default_duration_days: 10 },
  { id: 's3', name: 'Building', sort_order: 3, default_duration_days: 21 },
  { id: 's4', name: 'Testing', sort_order: 4, default_duration_days: 10 },
  { id: 's5', name: 'Live', sort_order: 5, default_duration_days: 30 },
]

describe('isStageBehind', () => {
  const today = parseISODate('2026-03-20')

  it('requires in_progress, a start date, and a missed duration', () => {
    expect(
      isStageBehind(
        { status: 'in_progress', actual_start: '2026-03-10', expected_duration_days: 5 },
        today,
      ),
    ).toBe(true)
    expect(
      isStageBehind(
        { status: 'in_progress', actual_start: '2026-03-16', expected_duration_days: 5 },
        today,
      ),
    ).toBe(false)
    expect(
      isStageBehind(
        { status: 'complete', actual_start: '2026-03-01', expected_duration_days: 5 },
        today,
      ),
    ).toBe(false)
    expect(
      isStageBehind(
        { status: 'in_progress', actual_start: null, expected_duration_days: 5 },
        today,
      ),
    ).toBe(false)
  })

  it('is behind only after the deadline day', () => {
    const start = parseISODate('2026-03-10')
    const deadline = addDays(start, 5)
    expect(deadline).toEqual(parseISODate('2026-03-15'))
    expect(
      isStageBehind(
        { status: 'in_progress', actual_start: '2026-03-10', expected_duration_days: 5 },
        parseISODate('2026-03-15'),
      ),
    ).toBe(false)
    expect(
      isStageBehind(
        { status: 'in_progress', actual_start: '2026-03-10', expected_duration_days: 5 },
        parseISODate('2026-03-16'),
      ),
    ).toBe(true)
  })
})

describe('agent schedule flags', () => {
  const today = parseISODate('2026-03-20')

  it('marks overdue when target go-live passed and stage is below Live', () => {
    expect(
      isPastTargetGoLive(
        { target_go_live: '2026-03-01', current_stage_id: 's3' },
        stages,
        today,
      ),
    ).toBe(true)
    expect(
      isPastTargetGoLive(
        { target_go_live: '2026-03-01', current_stage_id: 's5' },
        stages,
        today,
      ),
    ).toBe(false)
  })

  it('marks an agent behind from a late stage or a missed go-live', () => {
    expect(
      isAgentBehind(
        { target_go_live: '2026-04-01', current_stage_id: 's2' },
        [{ status: 'in_progress', actual_start: '2026-03-01', expected_duration_days: 5 }],
        stages,
        today,
      ),
    ).toBe(true)
    expect(
      isAgentBehind(
        { target_go_live: '2026-03-01', current_stage_id: 's2' },
        [{ status: 'in_progress', actual_start: '2026-03-18', expected_duration_days: 10 }],
        stages,
        today,
      ),
    ).toBe(true)
  })

  it('counts in-flight as active and below Live', () => {
    expect(isInFlight({ status: 'active', current_stage_id: 's3' }, stages)).toBe(true)
    expect(isInFlight({ status: 'active', current_stage_id: 's5' }, stages)).toBe(false)
    expect(isInFlight({ status: 'on_hold', current_stage_id: 's3' }, stages)).toBe(false)
  })

  it('detects requests created this month', () => {
    expect(createdThisMonth('2026-03-04T12:00:00Z', parseISODate('2026-03-20'))).toBe(true)
    expect(createdThisMonth('2026-02-28T12:00:00Z', parseISODate('2026-03-20'))).toBe(false)
  })
})

describe('date presentation', () => {
  const today = parseISODate('2026-03-20')

  it('counts whole days to a target', () => {
    expect(daysUntil('2026-03-25', today)).toBe(5)
    expect(daysUntil('2026-03-20', today)).toBe(0)
    expect(daysUntil('2026-03-15', today)).toBe(-5)
    expect(daysUntil(null, today)).toBeNull()
  })

  it('phrases the target date for readers', () => {
    expect(dueLabel('2026-03-20', today)).toBe('Due today')
    expect(dueLabel('2026-03-21', today)).toBe('Due tomorrow')
    expect(dueLabel('2026-04-01', today)).toBe('in 12 days')
    expect(dueLabel('2026-03-19', today)).toBe('1 day late')
    expect(dueLabel('2026-03-14', today)).toBe('6 days late')
    expect(dueLabel(null, today)).toBe('No target set')
  })

  it('builds avatar initials from one or two names', () => {
    expect(initials('Nabih')).toBe('N')
    expect(initials('Priya Raman')).toBe('PR')
    expect(initials('  ')).toBe('')
  })
})
