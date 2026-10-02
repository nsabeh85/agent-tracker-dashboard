-- Backlog is the manual holding area for Jira requests the team has
-- reviewed and does not want on the dashboard. Do not use the new label
-- in this transaction; Postgres applies ADD VALUE only after commit.

ALTER TYPE public.agent_status ADD VALUE IF NOT EXISTS 'backlog';
