import type {
  AgentPriority,
  AgentStageWithOwners,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Owner,
  OwnerAssignment,
  Stage,
  Substep,
} from '../types/database'
import {
  agentDescription,
  JIRA_INTAKE,
  ownerName,
  requesterName,
  type JiraIntake,
} from './jiraIntake'

/**
 * Sample content used only when Supabase credentials are absent, so the
 * dashboard can be reviewed and demoed before a project is connected.
 */

const DAY_MS = 86_400_000
const stamp = (offset: number) => new Date(Date.now() + offset * DAY_MS).toISOString()

const CATALOG = [
  { name: 'Requested', days: 5, substeps: ['Intake form received', 'Requester confirmed'] },
  {
    name: 'Scoping',
    days: 10,
    substeps: ['Use case defined', 'Data sources identified', 'Effort estimated'],
  },
  {
    name: 'Building',
    days: 21,
    substeps: [
      'Data cleaning and prep',
      'Connectors configured',
      'Topics and prompts authored',
      'Internal review',
    ],
  },
  {
    name: 'Testing',
    days: 10,
    substeps: ['Test environment validation', 'Requester UAT', 'Prod deployment'],
  },
  { name: 'Live', days: 30, substeps: ['Handover to owner', 'Adoption check at 30 days'] },
]

export const demoStages: Stage[] = CATALOG.map((stage, index) => ({
  id: `stage-${index + 1}`,
  name: stage.name,
  sort_order: index + 1,
  default_duration_days: stage.days,
}))

export const demoSubsteps: Substep[] = CATALOG.flatMap((stage, index) =>
  stage.substeps.map((name, position) => ({
    id: `sub-${index + 1}-${position + 1}`,
    stage_id: `stage-${index + 1}`,
    name,
    sort_order: position + 1,
    default_duration_days: null,
  })),
)

export const demoOwners: Owner[] = [
  {
    id: 'owner-lauren',
    full_name: 'Lauren Lawhon',
    active: true,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'owner-nabih',
    full_name: 'Nabih Sabeh',
    active: true,
    sort_order: 2,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'owner-mark',
    full_name: 'Mark Seay',
    active: true,
    sort_order: 3,
    created_at: '2026-01-01T00:00:00Z',
  },
]

function ownerAssignments(name: string): OwnerAssignment[] {
  const owner = demoOwners.find((candidate) => candidate.full_name === name)
  return owner ? [{ owner_id: owner.id, owner }] : []
}

function daysAgo(isoDate: string): number {
  const created = new Date(`${isoDate}T12:00:00`)
  return Math.max(0, Math.round((Date.now() - created.getTime()) / DAY_MS))
}

function buildStages(row: JiraIntake): AgentStageWithOwners[] {
  const id = row.key.toLowerCase()
  const assignments = ownerAssignments(ownerName(row.assignee))
  return CATALOG.map((stage, index) => ({
    id: `${id}-st-${index + 1}`,
    agent_id: id,
    stage_id: `stage-${index + 1}`,
    expected_duration_days: stage.days,
    actual_start: null,
    actual_end: null,
    status: 'not_started' as const,
    agent_stage_owners: assignments,
  }))
}

function buildSubsteps(row: JiraIntake, stages: AgentStageWithOwners[]): AgentSubstep[] {
  const id = row.key.toLowerCase()
  return CATALOG.flatMap((stage, index) =>
    stage.substeps.map((name, position) => ({
      id: `${id}-sub-${index + 1}-${position + 1}`,
      agent_id: id,
      agent_stage_id: stages[index].id,
      substep_id: `sub-${index + 1}-${position + 1}`,
      name,
      sort_order: position + 1,
      status: 'not_started' as const,
      actual_start: null,
      actual_end: null,
    })),
  )
}

export const demoAgents: AgentWithStages[] = JIRA_INTAKE.map((row) => {
  const created = daysAgo(row.created)
  const assignedTo = ownerName(row.assignee)
  return {
    id: row.key.toLowerCase(),
    title: row.title,
    requester_name: requesterName(row.assignee),
    requester_department: row.department,
    description: agentDescription(row),
    priority: 'medium' as AgentPriority,
    current_stage_id: 'stage-1',
    target_go_live: null,
    assigned_to: assignedTo,
    status: 'pending_approval',
    created_at: stamp(-created),
    updated_at: stamp(-created),
    agent_stages: buildStages(row),
    agent_owners: ownerAssignments(assignedTo),
  }
})

export const demoAgentSubsteps: AgentSubstep[] = JIRA_INTAKE.flatMap((row) => {
  const stages = demoAgents.find((agent) => agent.id === row.key.toLowerCase())?.agent_stages ?? []
  return buildSubsteps(row, stages)
})

export const demoComments: Comment[] = []
