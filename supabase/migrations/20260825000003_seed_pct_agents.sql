-- Idempotent seed of the current PCT AI Request backlog.
-- Every row is created as pending_approval (create_agent default).

DO $seed$
DECLARE
  r record;
  v_id uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
    ('PCT-581', 'powerbi_mcp-Copilot Agent', 'Data', 'Not specified', 'Unassigned', '2026-08-18'::date, 'PCT-581. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-581'),
    ('PCT-563', 'Due Diligence Agent V2 (Copilot Studio)', 'Legal', 'Not specified', 'Unassigned', '2026-08-10'::date, 'PCT-563. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-563'),
    ('PCT-562', 'Due Diligence Agent - v1 (O365 Agent)', 'Legal', 'Not specified', 'Unassigned', '2026-08-10'::date, 'PCT-562. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-562'),
    ('PCT-559', 'HR Self Service Agent (Copilot Studio integrated w/ ServiceNow)', 'People', 'Not specified', 'Unassigned', '2026-08-06'::date, 'PCT-559. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-559'),
    ('PCT-555', 'Business Request: AI-Powered Tax Document Translation Agent with OCR and Layout Preservation', 'Finance', 'Not specified', 'Unassigned', '2026-08-04'::date, 'PCT-555. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-555'),
    ('PCT-533', 'New Oracle Application within IDCS: POC - Copilot to Oracle HCM', 'People', 'Not specified', 'Unassigned', '2026-07-24'::date, 'PCT-533. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-533'),
    ('PCT-526', 'AI assistant project Switzerland', 'Operations', 'Not specified', 'Unassigned', '2026-07-17'::date, 'PCT-526. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-526'),
    ('PCT-520', 'PRAXO OPS - AI Operational Intelligence Layer for Data Center Operations', 'Operations', 'Justin Taylor', 'Justin Taylor', '2026-07-10'::date, 'PCT-520. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-520'),
    ('PCT-510', 'Copilot Coworking - project management system', 'PMO', 'Justin Taylor', 'Justin Taylor', '2026-07-09'::date, 'PCT-510. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-510'),
    ('PCT-502', 'Whitespace Planning AI Agent (CAD Stencils)', 'Operations', 'Justin Taylor', 'Justin Taylor', '2026-07-06'::date, 'PCT-502. Imported from Jira; pending approval. Labels: digital-worker. https://digitalrealty-cdo.atlassian.net/browse/PCT-502'),
    ('PCT-499', 'SE Pre-Sales Intake Agent (AgentForce-Style)', 'Commercial', 'Justin Taylor', 'Justin Taylor', '2026-07-06'::date, 'PCT-499. Imported from Jira; pending approval. Labels: intelligent-automation. https://digitalrealty-cdo.atlassian.net/browse/PCT-499'),
    ('PCT-498', 'AI Assistant for global legal risk register', 'Legal', 'Justin Taylor', 'Justin Taylor', '2026-07-06'::date, 'PCT-498. Imported from Jira; pending approval. Labels: digital-worker. https://digitalrealty-cdo.atlassian.net/browse/PCT-498'),
    ('PCT-495', 'Agentic SharePoint Document Organisation and Migration: Tooling Evaluation (Power Automate / AI Hub and n8n)', 'IT', 'Tony Lorino', 'Tony Lorino', '2026-07-06'::date, 'PCT-495. Imported from Jira; pending approval. Labels: tool-request. https://digitalrealty-cdo.atlassian.net/browse/PCT-495'),
    ('PCT-488', 'create a Health and Safety AI bot/avatar for a new HS Management system', 'EHS', 'Justin Taylor', 'Justin Taylor', '2026-07-01'::date, 'PCT-488. Imported from Jira; pending approval. Labels: digital-worker. https://digitalrealty-cdo.atlassian.net/browse/PCT-488'),
    ('PCT-487', 'HR Self Service Agentic Chat', 'People', 'Alejandro Figueroa', 'Alejandro Figueroa', '2026-06-30'::date, 'PCT-487. Imported from Jira; pending approval. Labels: digital-worker. https://digitalrealty-cdo.atlassian.net/browse/PCT-487'),
    ('PCT-471', 'AI Agent to Evaluate Costs', 'Finance', 'Sean Harrison', 'Sean Harrison', '2026-06-25'::date, 'PCT-471. Imported from Jira; pending approval. Labels: data-foundation, decision-intelligence. https://digitalrealty-cdo.atlassian.net/browse/PCT-471'),
    ('PCT-455', 'Microsoft Copilot Integration with ServiceNow for Security Operations and Service Management', 'Security', 'Justin Taylor', 'Justin Taylor', '2026-06-23'::date, 'PCT-455. Imported from Jira; pending approval. Labels: Commercial. https://digitalrealty-cdo.atlassian.net/browse/PCT-455'),
    ('PCT-453', 'AI tutor', 'People', 'Alejandro Figueroa', 'Alejandro Figueroa', '2026-06-21'::date, 'PCT-453. Imported from Jira; pending approval. Labels: digital-worker. https://digitalrealty-cdo.atlassian.net/browse/PCT-453'),
    ('PCT-385', 'Procurement Guidance AI Agent', 'Procurement', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-385. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-385'),
    ('PCT-384', 'AI Agent for Contract Discovery & Insights', 'Legal', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-384. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-384'),
    ('PCT-371', 'Oracle Digital Assistant (ODA) feasibility / POC', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-371. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-371'),
    ('PCT-370', 'Navan travel agent A2A integration pattern', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-370. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-370'),
    ('PCT-369', 'HR single (Copilot) / dual (Praxo) pane of glass chat agent', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-369. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-369'),
    ('PCT-364', 'Candidate screening support agent', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-364. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-364'),
    ('PCT-363', 'Hiring manager requisition intake meeting agent', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-363. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-363'),
    ('PCT-361', 'Benefits interpretation assistant', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-361. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-361'),
    ('PCT-360', 'Oracle-native HR self-service assistant', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-360. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-360'),
    ('PCT-359', 'Conversational ServiceNow case creation (email interception)', 'People', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-359. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-359'),
    ('PCT-358', 'HR conversational policy interpretation (RAG Q&A)', 'People', 'Nabih Sabeh', 'Nabih', '2026-06-21'::date, 'PCT-358. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-358'),
    ('PCT-352', 'Customer audit / questionnaire LLM draft-response assistant', 'Legal', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-352. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-352'),
    ('PCT-338', 'Investor Chatbot', 'Finance', 'Justin Taylor', 'Justin Taylor', '2026-06-21'::date, 'PCT-338. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-338'),
    ('PCT-334', 'AI chatbot for fund-raise questions', 'Finance', 'Chris Hunsaker', 'Chris Hunsaker', '2026-06-21'::date, 'PCT-334. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-334'),
    ('PCT-333', 'Internal AI chatbot for finance operations & executive reporting', 'Finance', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-333. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-333'),
    ('PCT-319', 'Hypothesis-generation assistant for market entry, power, legal, and permitting diligence', 'Strategy', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-319. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-319'),
    ('PCT-311', 'Single-account research & meeting-prep assistant (Account researcher persona)', 'Commercial', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-311. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-311'),
    ('PCT-286', 'LLM-based operational dashboard querying (Phaedra)', 'Operations', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-286. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-286'),
    ('PCT-273', 'Service delivery communication automation (agentic customer notifications)', 'Operations', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-273. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-273'),
    ('PCT-249', 'Fund side-letter assistant', 'Legal', 'Not specified', 'Unassigned', '2026-06-21'::date, 'PCT-249. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-249'),
    ('PCT-240', 'Vetted HR/Employment Q&A agent for HRBPs', 'People', 'Nabih Sabeh', 'Nabih', '2026-06-21'::date, 'PCT-240. Imported from Jira; pending approval. Labels: ai-enablement-literacy. https://digitalrealty-cdo.atlassian.net/browse/PCT-240'),
    ('PCT-49', 'Executive Request - Equinix Analyst Bot', 'Executive', 'Nabih Sabeh', 'Nabih', '2026-06-09'::date, 'PCT-49. Imported from Jira; pending approval. https://digitalrealty-cdo.atlassian.net/browse/PCT-49')
    ) AS t(jira_key, title, department, requester, owner, created_on, description)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.description LIKE r.jira_key || '. Imported from Jira%'
    ) THEN
      CONTINUE;
    END IF;

    v_id := public.create_agent(
      r.title,
      r.requester,
      r.department,
      r.description,
      'medium',
      NULL,
      r.owner
    );

    UPDATE public.agents
    SET created_at = r.created_on::timestamptz,
        updated_at = r.created_on::timestamptz
    WHERE id = v_id;
  END LOOP;
END;
$seed$;
