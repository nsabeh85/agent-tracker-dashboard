import { describe, expect, it } from 'vitest'
import {
  isTrackingToken,
  parsePublicAgent,
  trackingMailto,
  trackingPath,
  trackingUrl,
} from './tracking'

describe('tracking helpers', () => {
  it('accepts 32-character hex tokens only', () => {
    expect(isTrackingToken('a'.repeat(32))).toBe(true)
    expect(isTrackingToken('A'.repeat(32))).toBe(false)
    expect(isTrackingToken('not-a-token')).toBe(false)
  })

  it('builds a share URL from origin and token', () => {
    const token = 'ab'.repeat(16)
    expect(trackingPath(token)).toBe(`/track/${token}`)
    expect(trackingUrl('https://tracker.example.com/', token)).toBe(
      `https://tracker.example.com/track/${token}`,
    )
  })

  it('opens a mail draft that includes the tracking URL', () => {
    const href = trackingMailto({
      to: 'requester@example.com',
      title: 'Invoice bot',
      url: 'https://tracker.example.com/track/ab',
      requesterName: 'Sam Lee',
    })
    expect(href.startsWith('mailto:requester%40example.com?')).toBe(true)
    expect(decodeURIComponent(href)).toContain('Invoice bot')
    expect(decodeURIComponent(href)).toContain('https://tracker.example.com/track/ab')
    expect(decodeURIComponent(href)).toContain('Hi Sam')
  })
})

describe('parsePublicAgent', () => {
  it('returns a payload when required fields are present', () => {
    const parsed = parsePublicAgent({
      title: 'Invoice bot',
      description: 'Help with invoices',
      source_url: null,
      requester_name: 'Sam Lee',
      requester_department: 'Finance',
      priority: 'medium',
      status: 'active',
      owners: 'Lauren Lawhon',
      current_stage_id: 'stage-1',
      target_go_live: '2026-10-01',
      created_at: '2026-09-01T00:00:00Z',
      stages: [
        {
          id: 'as-1',
          stage_id: 'stage-1',
          name: 'Requested',
          sort_order: 1,
          status: 'in_progress',
          expected_duration_days: 5,
          actual_start: '2026-09-01',
          actual_end: null,
        },
      ],
      substeps: [],
    })
    expect(parsed?.title).toBe('Invoice bot')
    expect(parsed?.stages).toHaveLength(1)
    expect(parsed?.comments).toEqual([])
  })

  it('includes view-only comments without requiring an author email', () => {
    const parsed = parsePublicAgent({
      title: 'Invoice bot',
      description: '',
      source_url: null,
      requester_name: 'Sam Lee',
      requester_department: 'Finance',
      priority: 'medium',
      status: 'active',
      owners: 'Lauren Lawhon',
      current_stage_id: 'stage-1',
      target_go_live: null,
      created_at: '2026-09-01T00:00:00Z',
      stages: [],
      substeps: [],
      comments: [
        {
          id: 'c1',
          author_name: 'Nabih Sabeh',
          body: 'Waiting on UAT.',
          created_at: '2026-09-10T12:00:00Z',
          agent_stage_id: 'as-4',
        },
      ],
    })
    expect(parsed?.comments).toEqual([
      {
        id: 'c1',
        author_name: 'Nabih Sabeh',
        body: 'Waiting on UAT.',
        created_at: '2026-09-10T12:00:00Z',
        agent_stage_id: 'as-4',
      },
    ])
  })

  it('rejects incomplete payloads', () => {
    expect(parsePublicAgent({ title: 'Missing the rest' })).toBeNull()
    expect(parsePublicAgent(null)).toBeNull()
  })
})
