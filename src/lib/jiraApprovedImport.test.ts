import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_MAX_CHARS,
  UNASSIGNED_OWNER,
  adfToPlainText,
  mapJiraWebhookPayload,
  mapPriority,
  secretsMatch,
  stripEmail,
  webhookSecretFromHeaders,
} from './jiraApprovedImport'

const approvedAiRequest = {
  issue: {
    key: 'PCT-636',
    fields: {
      summary: 'CKA – Controlled Knowledge Architecture',
      issuetype: { name: 'AI Request' },
      project: { key: 'PCT' },
      status: { name: 'Approved' },
      priority: { name: 'Medium' },
      reporter: { displayName: 'Tony Lorino' },
      description: `### Requestor

Carl Agar <cagar@digitalrealty.com>

### Business unit

Construction

### Urgency

high

### Business purpose

Microsoft Copilot provides AI capability but lacks a structured framework.
`,
    },
  },
}

describe('mapJiraWebhookPayload', () => {
  it('maps an approved PCT AI Request without inventing owners or go-live', () => {
    const result = mapJiraWebhookPayload(approvedAiRequest)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.value).toMatchObject({
      issueKey: 'PCT-636',
      title: 'CKA – Controlled Knowledge Architecture',
      requesterName: 'Carl Agar',
      requesterDepartment: 'Construction',
      priority: 'high',
      sourceUrl: 'https://digitalrealty-cdo.atlassian.net/browse/PCT-636',
      assignedTo: UNASSIGNED_OWNER,
      targetGoLive: null,
    })
    expect(result.value.description).toContain('structured framework')
    expect(result.value.description).toContain('Carl Agar')
    expect(result.value.description).not.toContain('cagar@digitalrealty.com')
  })

  it('maps later Jira edits so an existing tracker row can be refreshed', () => {
    const edited = structuredClone(approvedAiRequest)
    edited.issue.fields.status.name = 'In Progress'
    edited.issue.fields.summary = 'CKA v2'
    const result = mapJiraWebhookPayload(edited)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.status).toBe('In Progress')
    expect(result.value.title).toBe('CKA v2')
  })

  it('rejects non-PCT and non-AI Request payloads', () => {
    const enhancement = structuredClone(approvedAiRequest)
    enhancement.issue.fields.issuetype.name = 'Enhancement'
    expect(mapJiraWebhookPayload(enhancement)).toEqual({
      ok: false,
      reason: 'wrong_issue_type',
    })

    const otherKey = structuredClone(approvedAiRequest)
    otherKey.issue.key = 'AIBU-79'
    otherKey.issue.fields.project.key = 'AIBU'
    expect(mapJiraWebhookPayload(otherKey)).toEqual({
      ok: false,
      reason: 'invalid_key',
    })

    const otherProject = structuredClone(approvedAiRequest)
    otherProject.issue.fields.project.key = 'AIBU'
    expect(mapJiraWebhookPayload(otherProject)).toEqual({
      ok: false,
      reason: 'wrong_project',
    })
  })

  it('truncates long descriptions and flattens Atlassian document format', () => {
    const long = structuredClone(approvedAiRequest)
    long.issue.fields.description = `${'x'.repeat(DESCRIPTION_MAX_CHARS + 80)}`
    const truncated = mapJiraWebhookPayload(long)
    expect(truncated.ok).toBe(true)
    if (truncated.ok) {
      expect(truncated.value.description).toHaveLength(DESCRIPTION_MAX_CHARS)
    }

    expect(
      adfToPlainText({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Requestor' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Jane Doe' }],
          },
        ],
      }),
    ).toContain('Requestor')
  })
})

describe('helpers', () => {
  it('maps urgency independently of Jira priority', () => {
    expect(mapPriority('high', 'Medium')).toBe('high')
    expect(mapPriority('', 'Low')).toBe('low')
    expect(mapPriority('', 'Medium')).toBe('medium')
  })

  it('strips emails from requestor lines', () => {
    expect(stripEmail('Carl Agar <cagar@digitalrealty.com>')).toBe('Carl Agar')
  })

  it('compares webhook secrets without accepting short or missing values', () => {
    const secret = 'abcdefghijklmnopqrstuvwxyz'
    expect(secretsMatch(secret, secret)).toBe(true)
    expect(secretsMatch(secret, 'different-secret-value-ok')).toBe(false)
    expect(secretsMatch('short', 'short')).toBe(false)
    expect(secretsMatch(secret, null)).toBe(false)
  })

  it('reads the secret from a dedicated header or a bearer token', () => {
    expect(
      webhookSecretFromHeaders(
        new Headers({ 'X-Jira-Webhook-Secret': ' from-header ' }),
      ),
    ).toBe('from-header')
    expect(
      webhookSecretFromHeaders(new Headers({ Authorization: 'Bearer token-value' })),
    ).toBe('token-value')
  })
})
