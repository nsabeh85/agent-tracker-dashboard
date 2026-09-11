import { describe, expect, it } from 'vitest'
import {
  addDays,
  allSubstepsComplete,
  canAutoAdvance,
  stageItemsComplete,
  createdThisMonth,
  daysUntil,
  dueLabel,
  initials,
  isAgentBehind,
  isInFlight,
  isPastTargetGoLive,
  isFilledDate,
  isStageBehind,
  needsGoLiveDate,
  nextStageAfter,
  parseISODate,
  stageStatusFromItems,
  summedDurationDays,
} from './schedule'
import { isMissingFunctionError } from './supabase'
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
    expect(isInFlight({ status: 'pending_approval', current_stage_id: 's1' }, stages)).toBe(
      false,
    )
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

describe('stage auto-advance', () => {
  const rows = stages.map((stage) => ({ stage }))

  it('finds the next stage in catalog order regardless of input order', () => {
    expect(nextStageAfter(rows, rows[1])?.stage.id).toBe('s3')
    expect(nextStageAfter([...rows].reverse(), rows[1])?.stage.id).toBe('s3')
  })

  it('returns null at the end of the workflow', () => {
    expect(nextStageAfter(rows, rows[4])).toBeNull()
  })

  it('advances only the stage the tracker points at', () => {
    const done = [{ status: 'complete' as const }]
    expect(canAutoAdvance({ status: 'in_progress', stage_id: 's2' }, 's2', done)).toBe(true)
    expect(canAutoAdvance({ status: 'in_progress', stage_id: 's4' }, 's2', done)).toBe(false)
  })

  it('refuses to advance a stage that is already complete', () => {
    expect(canAutoAdvance({ status: 'complete', stage_id: 's2' }, 's2')).toBe(false)
  })

  it('treats a stage as finished only when every sub-step is complete', () => {
    expect(allSubstepsComplete([{ status: 'complete' }, { status: 'complete' }])).toBe(true)
    expect(allSubstepsComplete([{ status: 'complete' }, { status: 'in_progress' }])).toBe(false)
    expect(allSubstepsComplete([{ status: 'blocked' }])).toBe(false)
  })

  it('never finishes a stage that has no sub-steps by ticking', () => {
    expect(allSubstepsComplete([])).toBe(false)
  })

  it('does not auto-advance a stage that has no items', () => {
    expect(stageItemsComplete([])).toBe(true)
    expect(canAutoAdvance({ status: 'in_progress', stage_id: 's2' }, 's2', [])).toBe(false)
    expect(allSubstepsComplete([])).toBe(false)
  })

  it('requires a target go-live date only when the next stage is Testing', () => {
    expect(needsGoLiveDate('Testing', null)).toBe(true)
    expect(needsGoLiveDate('Testing', '2026-10-01')).toBe(false)
    expect(needsGoLiveDate('Building', null)).toBe(false)
    expect(needsGoLiveDate('Live', null)).toBe(false)
  })

  it('sums catalog sub-step days into the stage default duration', () => {
    expect(summedDurationDays([{ default_duration_days: 3 }, { default_duration_days: 2 }])).toBe(5)
    expect(summedDurationDays([{ default_duration_days: 3 }, { default_duration_days: 3 }])).toBe(6)
    expect(summedDurationDays([{ default_duration_days: 3 }, { default_duration_days: null }])).toBe(3)
    expect(summedDurationDays([])).toBe(0)
  })

  it('treats only an explicit yyyy-mm-dd value as a chosen date', () => {
    expect(isFilledDate('')).toBe(false)
    expect(isFilledDate('  ')).toBe(false)
    expect(isFilledDate(null)).toBe(false)
    expect(isFilledDate('2026-09-11')).toBe(true)
  })

  it('does not auto-advance while any item is still open', () => {
    expect(
      canAutoAdvance({ status: 'in_progress', stage_id: 's2' }, 's2', [
        { status: 'complete' },
        { status: 'not_started' },
      ]),
    ).toBe(false)
    expect(
      canAutoAdvance({ status: 'in_progress', stage_id: 's2' }, 's2', [
        { status: 'complete' },
        { status: 'complete' },
      ]),
    ).toBe(true)
  })

  it('derives stage status from the current item state', () => {
    expect(stageStatusFromItems([])).toBe('not_started')
    expect(stageStatusFromItems([{ status: 'not_started' }])).toBe('not_started')
    expect(
      stageStatusFromItems([{ status: 'complete' }, { status: 'not_started' }]),
    ).toBe('in_progress')
    expect(
      stageStatusFromItems([{ status: 'complete' }, { status: 'complete' }]),
    ).toBe('complete')
    expect(
      stageStatusFromItems([{ status: 'complete' }, { status: 'blocked' }]),
    ).toBe('blocked')
  })

  it('reverts complete to in progress or not started when work is undone', () => {
    expect(
      stageStatusFromItems([{ status: 'complete' }, { status: 'not_started' }]),
    ).toBe('in_progress')
    expect(
      stageStatusFromItems([{ status: 'not_started' }, { status: 'not_started' }]),
    ).toBe('not_started')
  })
})

describe('missing RPC detection', () => {
  it('recognizes PostgREST and Postgres missing-function errors', () => {
    expect(isMissingFunctionError({ code: 'PGRST202', message: 'Could not find the function' })).toBe(
      true,
    )
    expect(isMissingFunctionError({ code: '42883', message: 'function does not exist' })).toBe(true)
    expect(
      isMissingFunctionError({
        message: 'Could not find the function public.complete_stage_and_advance',
      }),
    ).toBe(true)
  })

  it('does not treat business-rule failures as a missing function', () => {
    expect(
      isMissingFunctionError({ message: 'Every item in the current stage must be complete' }),
    ).toBe(false)
    expect(
      isMissingFunctionError({ message: 'A stage with no items cannot auto-advance' }),
    ).toBe(false)
    expect(
      isMissingFunctionError({
        message: 'Set a target go-live date before a request can enter Testing.',
      }),
    ).toBe(false)
    expect(isMissingFunctionError(null)).toBe(false)
  })
})
