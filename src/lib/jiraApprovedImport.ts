export const JIRA_APPROVED_STATUS = 'Approved'
export const JIRA_AI_REQUEST_TYPE = 'AI Request'
export const JIRA_PROJECT_KEY = 'PCT'
export const JIRA_BROWSE_ORIGIN = 'https://digitalrealty-cdo.atlassian.net'
export const UNASSIGNED_OWNER = 'Unassigned'
export const DESCRIPTION_MAX_CHARS = 4000
export const WEBHOOK_SECRET_MIN_LENGTH = 16

export type AgentPriority = 'low' | 'medium' | 'high'

export type JiraImportRejectReason =
  | 'wrong_project'
  | 'wrong_issue_type'
  | 'invalid_key'
  | 'invalid_source_url'
  | 'missing_title'

export function isApprovedStatus(status: string): boolean {
  return status.trim().toLowerCase() === JIRA_APPROVED_STATUS.toLowerCase()
}

export type MappedJiraImport = {
  issueKey: string
  issueType: string
  status: string
  projectKey: string
  title: string
  requesterName: string
  requesterDepartment: string
  description: string
  priority: AgentPriority
  sourceUrl: string
  assignedTo: typeof UNASSIGNED_OWNER
  targetGoLive: null
}

export type MapJiraImportResult =
  | { ok: true; value: MappedJiraImport }
  | { ok: false; reason: JiraImportRejectReason }

type JsonObject = Record<string, unknown>

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function namedField(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (isObject(value) && typeof value.name === 'string') return value.name.trim()
  return ''
}

function displayName(value: unknown): string {
  if (typeof value === 'string') return stripEmail(value)
  if (isObject(value) && typeof value.displayName === 'string') {
    return stripEmail(value.displayName)
  }
  return ''
}

export function stripEmail(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim()
}

export function stripAngleBracketEmails(value: string): string {
  return value.replace(/<[^>]*@[^>]*>/g, '').replace(/[ \t]+\n/g, '\n')
}

export function adfToPlainText(node: unknown): string {
  if (node == null) return ''
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(adfToPlainText).join('')
  if (!isObject(node)) return ''

  const type = typeof node.type === 'string' ? node.type : ''
  if (type === 'text' && typeof node.text === 'string') return node.text
  if (type === 'hardBreak') return '\n'

  const inner = Array.isArray(node.content)
    ? node.content.map(adfToPlainText).join('')
    : ''

  if (type === 'heading') {
    const level =
      isObject(node.attrs) && typeof node.attrs.level === 'number'
        ? node.attrs.level
        : 3
    return `${'#'.repeat(Math.min(Math.max(level, 1), 3))} ${inner.trim()}\n\n`
  }
  if (type === 'paragraph' || type === 'listItem') return `${inner}\n`
  return inner
}

function descriptionText(value: unknown): string {
  if (typeof value === 'string') return value
  return adfToPlainText(value)
}

function headingValue(body: string, headingPattern: string): string {
  const pattern = new RegExp(
    `^#{1,3}\\s*(?:${headingPattern})\\s*$\\s+([^\\n#]+)`,
    'im',
  )
  return pattern.exec(body)?.[1]?.trim() ?? ''
}

export function mapPriority(urgency: string, jiraPriority: string): AgentPriority {
  const source = `${urgency} ${jiraPriority}`.toLowerCase()
  if (/\bhigh\b|\bcritical\b|\bhighest\b/.test(source)) return 'high'
  if (/\blow\b|\blowest\b/.test(source)) return 'low'
  return 'medium'
}

export function pctBrowseUrl(issueKey: string): string {
  return `${JIRA_BROWSE_ORIGIN}/browse/${issueKey}`
}

export function isPctIssueKey(value: string): boolean {
  return /^PCT-\d+$/i.test(value)
}

function unwrapIssue(payload: unknown): JsonObject | null {
  if (!isObject(payload)) return null
  if (isObject(payload.issue)) return payload.issue
  if (typeof payload.key === 'string' && (isObject(payload.fields) || payload.summary)) {
    return payload
  }
  return null
}

export function secretsMatch(expected: string, provided: string | null): boolean {
  if (!expected || expected.length < WEBHOOK_SECRET_MIN_LENGTH) return false
  if (!provided) return false
  const encoder = new TextEncoder()
  const a = encoder.encode(expected)
  const b = encoder.encode(provided)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export function webhookSecretFromHeaders(headers: Headers): string | null {
  const named = headers.get('x-jira-webhook-secret')?.trim()
  if (named) return named
  const auth = headers.get('authorization')
  const match = auth?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

export function mapJiraWebhookPayload(payload: unknown): MapJiraImportResult {
  const issue = unwrapIssue(payload)
  if (!issue) {
    return { ok: false, reason: 'invalid_key' }
  }

  const fields = isObject(issue.fields) ? issue.fields : issue
  const issueKey = String(issue.key ?? fields.key ?? '').trim().toUpperCase()
  if (!isPctIssueKey(issueKey)) {
    return { ok: false, reason: 'invalid_key' }
  }

  const projectKey = (
    isObject(fields.project) && typeof fields.project.key === 'string'
      ? fields.project.key
      : issueKey.split('-')[0] ?? ''
  )
    .trim()
    .toUpperCase()
  if (projectKey !== JIRA_PROJECT_KEY) {
    return { ok: false, reason: 'wrong_project' }
  }

  const issueType = namedField(fields.issuetype ?? fields.issueType)
  if (issueType.toLowerCase() !== JIRA_AI_REQUEST_TYPE.toLowerCase()) {
    return { ok: false, reason: 'wrong_issue_type' }
  }

  const status = namedField(fields.status)
  const title = String(fields.summary ?? '').trim()
  if (!title) {
    return { ok: false, reason: 'missing_title' }
  }

  const rawDescription = stripAngleBracketEmails(descriptionText(fields.description))
  const requestor = headingValue(rawDescription, 'Requestor|Requester')
  const department = headingValue(rawDescription, 'Business unit|Department')
  const urgency = headingValue(rawDescription, 'Urgency')

  const requesterName =
    stripEmail(requestor) || displayName(fields.reporter) || 'Not specified'
  const description = rawDescription.trim().slice(0, DESCRIPTION_MAX_CHARS)

  return {
    ok: true,
    value: {
      issueKey,
      issueType,
      status,
      projectKey,
      title,
      requesterName,
      requesterDepartment: department || 'Unknown',
      description: description || title,
      priority: mapPriority(urgency, namedField(fields.priority)),
      sourceUrl: pctBrowseUrl(issueKey),
      assignedTo: UNASSIGNED_OWNER,
      targetGoLive: null,
    },
  }
}
