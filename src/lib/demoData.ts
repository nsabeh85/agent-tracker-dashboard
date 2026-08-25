import type {
  AgentPriority,
  AgentStage,
  AgentStatus,
  AgentSubstep,
  AgentWithStages,
  Comment,
  Stage,
  Substep,
} from '../types/database'
import { todayISO } from './schedule'

/**
 * Sample content used only when Supabase credentials are absent, so the
 * dashboard can be reviewed and demoed before a project is connected.
 */

const DAY_MS = 86_400_000
const day = (offset: number) => todayISO(new Date(Date.now() + offset * DAY_MS))
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

type DemoSpec = {
  id: string
  title: string
  requester_name: string
  requester_department: string
  description: string
  priority: AgentPriority
  assigned_to: string
  status: AgentStatus
  currentIndex: number
  target_go_live: string | null
  currentStartedDaysAgo: number
  currentDurationOverride?: number
  substepsDone: number
  createdDaysAgo: number
  updatedDaysAgo: number
}

const SPECS: DemoSpec[] = [
  {
    id: 'agent-1',
    title: 'Contract Summariser',
    requester_name: 'Priya Raman',
    requester_department: 'Legal',
    description:
      'Summarises supplier contracts, flags non-standard clauses, and drafts a reviewer checklist.',
    priority: 'high',
    assigned_to: 'Nabih',
    status: 'active',
    currentIndex: 2,
    target_go_live: day(18),
    currentStartedDaysAgo: 30,
    currentDurationOverride: 21,
    substepsDone: 2,
    createdDaysAgo: 54,
    updatedDaysAgo: 1,
  },
  {
    id: 'agent-2',
    title: 'Field Ops Assistant',
    requester_name: 'Tom Alvarez',
    requester_department: 'Operations',
    description:
      'Answers site technician questions from the maintenance handbook and logs follow-up tasks.',
    priority: 'medium',
    assigned_to: 'Mark',
    status: 'active',
    currentIndex: 3,
    target_go_live: day(12),
    currentStartedDaysAgo: 4,
    substepsDone: 1,
    createdDaysAgo: 61,
    updatedDaysAgo: 0,
  },
  {
    id: 'agent-3',
    title: 'HR Policy Helper',
    requester_name: 'Dana Whitfield',
    requester_department: 'People',
    description: 'Explains leave, travel, and expense policy with links to the source documents.',
    priority: 'low',
    assigned_to: 'Nabih',
    status: 'active',
    currentIndex: 4,
    target_go_live: day(-6),
    currentStartedDaysAgo: 8,
    substepsDone: 1,
    createdDaysAgo: 96,
    updatedDaysAgo: 3,
  },
  {
    id: 'agent-4',
    title: 'Invoice Triage Bot',
    requester_name: 'Samir Haddad',
    requester_department: 'Finance',
    description: 'Routes inbound invoices, matches purchase orders, and escalates mismatches.',
    priority: 'high',
    assigned_to: 'Mark',
    status: 'active',
    currentIndex: 1,
    target_go_live: day(-4),
    currentStartedDaysAgo: 6,
    substepsDone: 2,
    createdDaysAgo: 26,
    updatedDaysAgo: 2,
  },
  {
    id: 'agent-5',
    title: 'Sales Deck Builder',
    requester_name: 'Lena Ortiz',
    requester_department: 'Commercial',
    description: 'Assembles first-draft pitch decks from the approved content library.',
    priority: 'medium',
    assigned_to: 'Nabih',
    status: 'active',
    currentIndex: 0,
    target_go_live: day(48),
    currentStartedDaysAgo: 2,
    substepsDone: 1,
    createdDaysAgo: 2,
    updatedDaysAgo: 2,
  },
  {
    id: 'agent-6',
    title: 'Warehouse Chat Guide',
    requester_name: 'Ike Nwosu',
    requester_department: 'Supply Chain',
    description: 'Guides floor staff through pick, pack, and exception handling procedures.',
    priority: 'medium',
    assigned_to: 'Mark',
    status: 'on_hold',
    currentIndex: 2,
    target_go_live: day(35),
    currentStartedDaysAgo: 9,
    substepsDone: 1,
    createdDaysAgo: 9,
    updatedDaysAgo: 5,
  },
]

function buildStages(spec: DemoSpec): AgentStage[] {
  let cursor = -spec.currentStartedDaysAgo
  return CATALOG.map((stage, index) => {
    const id = `${spec.id}-st-${index + 1}`
    const expected =
      index === spec.currentIndex && spec.currentDurationOverride
        ? spec.currentDurationOverride
        : stage.days

    if (index < spec.currentIndex) {
      const end = cursor - (spec.currentIndex - index - 1) * 4 - 1
      return {
        id,
        agent_id: spec.id,
        stage_id: `stage-${index + 1}`,
        expected_duration_days: expected,
        actual_start: day(end - stage.days),
        actual_end: day(end),
        status: 'complete',
      }
    }

    if (index === spec.currentIndex) {
      cursor = -spec.currentStartedDaysAgo
      return {
        id,
        agent_id: spec.id,
        stage_id: `stage-${index + 1}`,
        expected_duration_days: expected,
        actual_start: day(cursor),
        actual_end: null,
        status: spec.status === 'on_hold' ? 'blocked' : 'in_progress',
      }
    }

    return {
      id,
      agent_id: spec.id,
      stage_id: `stage-${index + 1}`,
      expected_duration_days: expected,
      actual_start: null,
      actual_end: null,
      status: 'not_started',
    }
  })
}

function buildSubsteps(spec: DemoSpec, stages: AgentStage[]): AgentSubstep[] {
  return CATALOG.flatMap((stage, index) =>
    stage.substeps.map((name, position) => {
      const agentStage = stages[index]
      const done =
        index < spec.currentIndex ||
        (index === spec.currentIndex && position < spec.substepsDone)
      const active =
        index === spec.currentIndex && position === spec.substepsDone && spec.status === 'active'

      return {
        id: `${spec.id}-sub-${index + 1}-${position + 1}`,
        agent_id: spec.id,
        agent_stage_id: agentStage.id,
        substep_id: `sub-${index + 1}-${position + 1}`,
        name,
        sort_order: position + 1,
        status: done ? 'complete' : active ? 'in_progress' : 'not_started',
        actual_start: done || active ? agentStage.actual_start : null,
        actual_end: done ? (agentStage.actual_end ?? day(-2)) : null,
      } satisfies AgentSubstep
    }),
  )
}

export const demoAgents: AgentWithStages[] = SPECS.map((spec) => ({
  id: spec.id,
  title: spec.title,
  requester_name: spec.requester_name,
  requester_department: spec.requester_department,
  description: spec.description,
  priority: spec.priority,
  current_stage_id: `stage-${spec.currentIndex + 1}`,
  target_go_live: spec.target_go_live,
  assigned_to: spec.assigned_to,
  status: spec.status,
  created_at: stamp(-spec.createdDaysAgo),
  updated_at: stamp(-spec.updatedDaysAgo),
  agent_stages: buildStages(spec),
}))

export const demoAgentSubsteps: AgentSubstep[] = SPECS.flatMap((spec) => {
  const stages = demoAgents.find((agent) => agent.id === spec.id)?.agent_stages ?? []
  return buildSubsteps(spec, stages)
})

export const demoComments: Comment[] = [
  {
    id: 'comment-1',
    agent_id: 'agent-1',
    agent_stage_id: 'agent-1-st-3',
    author_email: 'nabih@example.com',
    author_name: 'Nabih',
    body: 'Clause extraction is holding up well on the sample set. Waiting on Legal to confirm the redline format before we start internal review.',
    created_at: stamp(-1),
  },
  {
    id: 'comment-2',
    agent_id: 'agent-1',
    agent_stage_id: 'agent-1-st-2',
    author_email: 'mark@example.com',
    author_name: 'Mark',
    body: 'Scoping signed off. Two data sources were dropped because the contract archive already covers them.',
    created_at: stamp(-9),
  },
  {
    id: 'comment-3',
    agent_id: 'agent-2',
    agent_stage_id: 'agent-2-st-4',
    author_email: 'mark@example.com',
    author_name: 'Mark',
    body: 'UAT kicked off with four technicians. Feedback so far is on tone, not accuracy.',
    created_at: stamp(-2),
  },
]
