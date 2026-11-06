-- Set stored titles to the CDO intake summary for known PCT issues.
-- The board shows the PCT number as a Jira link in front of this name.
-- Rollback: restore agents.title from a backup taken before this update.
-- updated_at is left unchanged.

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;

UPDATE public.agents AS agent
SET title = intake.title
FROM (
  VALUES
    ('PCT-581', 'powerbi_mcp-Copilot Agent'),
    ('PCT-563', 'Due Diligence Agent V2 (Copilot Studio)'),
    ('PCT-562', 'Due Diligence Agent - v1 (O365 Agent)'),
    ('PCT-559', 'HR Self Service Agent (Copilot Studio integrated w/ ServiceNow)'),
    ('PCT-555', 'Business Request: AI-Powered Tax Document Translation Agent with OCR and Layout Preservation'),
    ('PCT-533', 'New Oracle Application within IDCS: POC - Copilot to Oracle HCM'),
    ('PCT-526', 'AI assistant project Switzerland'),
    ('PCT-520', 'PRAXO OPS - AI Operational Intelligence Layer for Data Center Operations'),
    ('PCT-510', 'Copilot Coworking - project management system'),
    ('PCT-502', 'Whitespace Planning AI Agent (CAD Stencils)'),
    ('PCT-499', 'SE Pre-Sales Intake Agent (AgentForce-Style)'),
    ('PCT-498', 'AI Assistant for global legal risk register'),
    ('PCT-495', 'Agentic SharePoint Document Organisation and Migration: Tooling Evaluation (Power Automate / AI Hub and n8n)'),
    ('PCT-488', 'create a Health and Safety AI bot/avatar for a new HS Management system'),
    ('PCT-487', 'HR Self Service Agentic Chat'),
    ('PCT-471', 'AI Agent to Evaluate Costs'),
    ('PCT-455', 'Microsoft Copilot Integration with ServiceNow for Security Operations and Service Management'),
    ('PCT-453', 'AI tutor'),
    ('PCT-385', 'Procurement Guidance AI Agent'),
    ('PCT-384', 'AI Agent for Contract Discovery & Insights'),
    ('PCT-371', 'Oracle Digital Assistant (ODA) feasibility / POC'),
    ('PCT-370', 'Navan travel agent A2A integration pattern'),
    ('PCT-369', 'HR single (Copilot) / dual (Praxo) pane of glass chat agent'),
    ('PCT-364', 'Candidate screening support agent'),
    ('PCT-363', 'Hiring manager requisition intake meeting agent'),
    ('PCT-361', 'Benefits interpretation assistant'),
    ('PCT-360', 'Oracle-native HR self-service assistant'),
    ('PCT-359', 'Conversational ServiceNow case creation (email interception)'),
    ('PCT-358', 'HR conversational policy interpretation (RAG Q&A)'),
    ('PCT-352', 'Customer audit / questionnaire LLM draft-response assistant'),
    ('PCT-338', 'Investor Chatbot'),
    ('PCT-334', 'AI chatbot for fund-raise questions'),
    ('PCT-333', 'Internal AI chatbot for finance operations & executive reporting'),
    ('PCT-319', 'Hypothesis-generation assistant for market entry, power, legal, and permitting diligence'),
    ('PCT-311', 'Single-account research & meeting-prep assistant (Account researcher persona)'),
    ('PCT-286', 'LLM-based operational dashboard querying (Phaedra)'),
    ('PCT-273', 'Service delivery communication automation (agentic customer notifications)'),
    ('PCT-249', 'Fund side-letter assistant'),
    ('PCT-240', 'Vetted HR/Employment Q&A agent for HRBPs'),
    ('PCT-49', 'Executive Request - Equinix Analyst Bot')
) AS intake(issue_key, title)
WHERE intake.issue_key = COALESCE(
  upper(substring(agent.source_url FROM 'PCT-[0-9]+')),
  upper(substring(agent.title FROM 'PCT-[0-9]+'))
)
AND agent.title IS DISTINCT FROM intake.title;

ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
