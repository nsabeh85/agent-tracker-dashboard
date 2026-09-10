import type { AgentStatus, AgentPriority, ProgressStatus } from '../types/database'

/** Path for the view-only tracker page for a single request. */
export function trackingPath(token: string): string {
  return `/track/${encodeURIComponent(token)}`
}

export function trackingUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}${trackingPath(token)}`
}

export function isTrackingToken(value: string | null | undefined): value is string {
  if (!value) return false
  return /^[0-9a-f]{32}$/.test(value)
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

/** Prefills the admin's mail client so the tracking URL is sent from their inbox. */
export function trackingMailto(args: {
  to: string
  title: string
  url: string
  requesterName?: string
}): string {
  const to = args.to.trim()
  const first = args.requesterName?.trim().split(/\s+/)[0]
  const subject = `Track your agent request: ${args.title}`
  const body = [
    `Hi${first ? ` ${first}` : ''},`,
    '',
    `You can follow progress on “${args.title}” here (no login required):`,
    args.url,
    '',
    'This page is only for this request. Bookmark the link and check back for updates.',
    '',
    'Thanks,',
    'PCT team',
  ].join('\n')
  const params = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&')
  return `mailto:${encodeURIComponent(to)}?${params}`
}

export type PublicStage = {
  id: string
  stage_id: string
  name: string
  sort_order: number
  status: ProgressStatus
  expected_duration_days: number
  actual_start: string | null
  actual_end: string | null
}

export type PublicSubstep = {
  id: string
  agent_stage_id: string
  name: string
  sort_order: number
  status: ProgressStatus
}

export type PublicAgent = {
  title: string
  description: string
  source_url: string | null
  requester_name: string
  requester_department: string
  priority: AgentPriority
  status: AgentStatus
  owners: string
  current_stage_id: string
  target_go_live: string | null
  created_at: string
  stages: PublicStage[]
  substeps: PublicSubstep[]
}

const STATUSES = new Set<AgentStatus>([
  'pending_approval',
  'active',
  'on_hold',
  'cancelled',
  'complete',
])
const PRIORITIES = new Set<AgentPriority>(['low', 'medium', 'high'])
const PROGRESS = new Set<ProgressStatus>(['not_started', 'in_progress', 'complete', 'blocked'])

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function asProgress(value: unknown): ProgressStatus | null {
  return typeof value === 'string' && PROGRESS.has(value as ProgressStatus)
    ? (value as ProgressStatus)
    : null
}

export function parsePublicAgent(value: unknown): PublicAgent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  const title = asString(row.title)
  const requesterName = asString(row.requester_name)
  const department = asString(row.requester_department)
  const currentStageId = asString(row.current_stage_id)
  const owners = asString(row.owners)
  const status = asString(row.status)
  const priority = asString(row.priority)
  if (!title || !requesterName || !department || !currentStageId || owners === null) return null
  if (!status || !STATUSES.has(status as AgentStatus)) return null
  if (!priority || !PRIORITIES.has(priority as AgentPriority)) return null

  const stages = Array.isArray(row.stages)
    ? row.stages.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const stage = item as Record<string, unknown>
        const id = asString(stage.id)
        const stageId = asString(stage.stage_id)
        const name = asString(stage.name)
        const progress = asProgress(stage.status)
        if (!id || !stageId || !name || !progress) return []
        if (typeof stage.sort_order !== 'number' || typeof stage.expected_duration_days !== 'number') {
          return []
        }
        return [
          {
            id,
            stage_id: stageId,
            name,
            sort_order: stage.sort_order,
            status: progress,
            expected_duration_days: stage.expected_duration_days,
            actual_start: asString(stage.actual_start),
            actual_end: asString(stage.actual_end),
          } satisfies PublicStage,
        ]
      })
    : []

  const substeps = Array.isArray(row.substeps)
    ? row.substeps.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const step = item as Record<string, unknown>
        const id = asString(step.id)
        const agentStageId = asString(step.agent_stage_id)
        const name = asString(step.name)
        const progress = asProgress(step.status)
        if (!id || !agentStageId || !name || !progress) return []
        if (typeof step.sort_order !== 'number') return []
        return [
          {
            id,
            agent_stage_id: agentStageId,
            name,
            sort_order: step.sort_order,
            status: progress,
          } satisfies PublicSubstep,
        ]
      })
    : []

  return {
    title,
    description: asString(row.description) ?? '',
    source_url: asString(row.source_url),
    requester_name: requesterName,
    requester_department: department,
    priority: priority as AgentPriority,
    status: status as AgentStatus,
    owners,
    current_stage_id: currentStageId,
    target_go_live: asString(row.target_go_live),
    created_at: asString(row.created_at) ?? '',
    stages,
    substeps,
  }
}
