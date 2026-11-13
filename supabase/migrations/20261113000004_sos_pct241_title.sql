-- Set the Sign-off Sheet (SOS) agent to PCT-241 and its intake name.
-- The board shows the PCT key as a Jira link in front of the name.
-- source_url is set to the PCT-241 browse link only when the agent has no source link yet,
-- so an existing link to a different request is never overwritten.
-- updated_at is left unchanged.
-- Rollback: set title back to 'Legal-01 Sign-off Sheet (SOS)' and source_url back to NULL
-- for the same agent id.

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;

UPDATE public.agents
SET
  title = 'Pre-signing Intelligent Contract Review',
  source_url = CASE
    WHEN source_url IS NULL THEN 'https://digitalrealty-cdo.atlassian.net/browse/PCT-241'
    ELSE source_url
  END
WHERE title ~* 'sign-?off sheet'
  AND (
    source_url IS NULL
    OR upper(substring(source_url FROM 'PCT-[0-9]+')) = 'PCT-241'
  )
  AND (
    title IS DISTINCT FROM 'Pre-signing Intelligent Contract Review'
    OR source_url IS NULL
  );

ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
