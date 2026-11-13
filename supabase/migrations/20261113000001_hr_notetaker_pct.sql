-- Store the backlog HR recruiter notetaker under its CDO intake name and Jira link.
-- The board shows "PCT-489" as the link in front of "Recruiter - Notetaker".
-- updated_at is left unchanged.
-- Rollback:
--   UPDATE public.agents
--   SET title = 'HR-17 Recruiter Notetaker', source_url = NULL
--   WHERE source_url = 'https://digitalrealty-cdo.atlassian.net/browse/PCT-489'
--     AND title = 'Recruiter - Notetaker';

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;

UPDATE public.agents
SET
  title = 'Recruiter - Notetaker',
  source_url = 'https://digitalrealty-cdo.atlassian.net/browse/PCT-489'
WHERE (
  upper(substring(COALESCE(source_url, '') FROM 'PCT-[0-9]+')) = 'PCT-489'
  OR upper(substring(title FROM 'PCT-[0-9]+')) = 'PCT-489'
  OR lower(btrim(regexp_replace(title, '[^[:alnum:]]+', ' ', 'g'))) IN (
    'hr 17 recruiter notetaker',
    'hr 17 recruiter note taker',
    'recruiter notetaker',
    'recruiter note taker'
  )
)
AND (
  title IS DISTINCT FROM 'Recruiter - Notetaker'
  OR source_url IS DISTINCT FROM 'https://digitalrealty-cdo.atlassian.net/browse/PCT-489'
);

ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
