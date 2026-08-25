export type JiraIntake = {
  key: string
  title: string
  department: string
  assignee: string
  created: string
  labels: string[]
}

const JIRA_BROWSE = 'https://digitalrealty-cdo.atlassian.net/browse'

/** Current PCT AI Request backlog. Tracker status is pending approval for every row. */
export const JIRA_INTAKE: JiraIntake[] = [
  { key: 'PCT-581', title: 'powerbi_mcp-Copilot Agent', department: 'Data', assignee: 'Unassigned', created: '2026-08-18', labels: [] },
  { key: 'PCT-563', title: 'Due Diligence Agent V2 (Copilot Studio)', department: 'Legal', assignee: 'Unassigned', created: '2026-08-10', labels: [] },
  { key: 'PCT-562', title: 'Due Diligence Agent - v1 (O365 Agent)', department: 'Legal', assignee: 'Unassigned', created: '2026-08-10', labels: [] },
  { key: 'PCT-559', title: 'HR Self Service Agent (Copilot Studio integrated w/ ServiceNow)', department: 'People', assignee: 'Unassigned', created: '2026-08-06', labels: [] },
  { key: 'PCT-555', title: 'Business Request: AI-Powered Tax Document Translation Agent with OCR and Layout Preservation', department: 'Finance', assignee: 'Unassigned', created: '2026-08-04', labels: [] },
  { key: 'PCT-533', title: 'New Oracle Application within IDCS: POC - Copilot to Oracle HCM', department: 'People', assignee: 'Unassigned', created: '2026-07-24', labels: [] },
  { key: 'PCT-526', title: 'AI assistant project Switzerland', department: 'Operations', assignee: 'Unassigned', created: '2026-07-17', labels: [] },
  { key: 'PCT-520', title: 'PRAXO OPS - AI Operational Intelligence Layer for Data Center Operations', department: 'Operations', assignee: 'Justin Taylor', created: '2026-07-10', labels: [] },
  { key: 'PCT-510', title: 'Copilot Coworking - project management system', department: 'PMO', assignee: 'Justin Taylor', created: '2026-07-09', labels: [] },
  { key: 'PCT-502', title: 'Whitespace Planning AI Agent (CAD Stencils)', department: 'Operations', assignee: 'Justin Taylor', created: '2026-07-06', labels: ['digital-worker'] },
  { key: 'PCT-499', title: 'SE Pre-Sales Intake Agent (AgentForce-Style)', department: 'Commercial', assignee: 'Justin Taylor', created: '2026-07-06', labels: ['intelligent-automation'] },
  { key: 'PCT-498', title: 'AI Assistant for global legal risk register', department: 'Legal', assignee: 'Justin Taylor', created: '2026-07-06', labels: ['digital-worker'] },
  { key: 'PCT-495', title: 'Agentic SharePoint Document Organisation and Migration: Tooling Evaluation (Power Automate / AI Hub and n8n)', department: 'IT', assignee: 'Tony Lorino', created: '2026-07-06', labels: ['tool-request'] },
  { key: 'PCT-488', title: 'create a Health and Safety AI bot/avatar for a new HS Management system', department: 'EHS', assignee: 'Justin Taylor', created: '2026-07-01', labels: ['digital-worker'] },
  { key: 'PCT-487', title: 'HR Self Service Agentic Chat', department: 'People', assignee: 'Alejandro Figueroa', created: '2026-06-30', labels: ['digital-worker'] },
  { key: 'PCT-471', title: 'AI Agent to Evaluate Costs', department: 'Finance', assignee: 'Sean Harrison', created: '2026-06-25', labels: ['data-foundation', 'decision-intelligence'] },
  { key: 'PCT-455', title: 'Microsoft Copilot Integration with ServiceNow for Security Operations and Service Management', department: 'Security', assignee: 'Justin Taylor', created: '2026-06-23', labels: ['Commercial'] },
  { key: 'PCT-453', title: 'AI tutor', department: 'People', assignee: 'Alejandro Figueroa', created: '2026-06-21', labels: ['digital-worker'] },
  { key: 'PCT-385', title: 'Procurement Guidance AI Agent', department: 'Procurement', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-384', title: 'AI Agent for Contract Discovery & Insights', department: 'Legal', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-371', title: 'Oracle Digital Assistant (ODA) feasibility / POC', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-370', title: 'Navan travel agent A2A integration pattern', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-369', title: 'HR single (Copilot) / dual (Praxo) pane of glass chat agent', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-364', title: 'Candidate screening support agent', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-363', title: 'Hiring manager requisition intake meeting agent', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-361', title: 'Benefits interpretation assistant', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-360', title: 'Oracle-native HR self-service assistant', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-359', title: 'Conversational ServiceNow case creation (email interception)', department: 'People', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-358', title: 'HR conversational policy interpretation (RAG Q&A)', department: 'People', assignee: 'Nabih Sabeh', created: '2026-06-21', labels: [] },
  { key: 'PCT-352', title: 'Customer audit / questionnaire LLM draft-response assistant', department: 'Legal', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-338', title: 'Investor Chatbot', department: 'Finance', assignee: 'Justin Taylor', created: '2026-06-21', labels: [] },
  { key: 'PCT-334', title: 'AI chatbot for fund-raise questions', department: 'Finance', assignee: 'Chris Hunsaker', created: '2026-06-21', labels: [] },
  { key: 'PCT-333', title: 'Internal AI chatbot for finance operations & executive reporting', department: 'Finance', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-319', title: 'Hypothesis-generation assistant for market entry, power, legal, and permitting diligence', department: 'Strategy', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-311', title: 'Single-account research & meeting-prep assistant (Account researcher persona)', department: 'Commercial', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-286', title: 'LLM-based operational dashboard querying (Phaedra)', department: 'Operations', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-273', title: 'Service delivery communication automation (agentic customer notifications)', department: 'Operations', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-249', title: 'Fund side-letter assistant', department: 'Legal', assignee: 'Unassigned', created: '2026-06-21', labels: [] },
  { key: 'PCT-240', title: 'Vetted HR/Employment Q&A agent for HRBPs', department: 'People', assignee: 'Nabih Sabeh', created: '2026-06-21', labels: ['ai-enablement-literacy'] },
  { key: 'PCT-49', title: 'Executive Request - Equinix Analyst Bot', department: 'Executive', assignee: 'Nabih Sabeh', created: '2026-06-09', labels: [] },
]

export function ownerName(assignee: string): string {
  if (assignee === 'Nabih Sabeh') return 'Nabih'
  return assignee
}

export function requesterName(assignee: string): string {
  return assignee === 'Unassigned' ? 'Not specified' : assignee
}

export function agentDescription(row: JiraIntake): string {
  const labels = row.labels.length ? ` Labels: ${row.labels.join(', ')}.` : ''
  return `${row.key}. Imported from Jira; pending approval.${labels} ${JIRA_BROWSE}/${row.key}`
}
