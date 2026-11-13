-- Remove the "Legal 52" prefix from the PCT-506 agent title (stored as "Legal 52, NDA review").
-- Rows are matched by the PCT key in source_url or title, or by the old wording.
-- updated_at is left unchanged.
-- Rollback: set title back to 'Legal 52, NDA review' for the same agent id.

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;

UPDATE public.agents
SET title = btrim(
  regexp_replace(title, '(^|[^[:alnum:]])Legal 52([^[:alnum:]]|$)', ' ', 'gi')
)
WHERE title ~* '(^|[^[:alnum:]])Legal 52([^[:alnum:]]|$)'
  AND (
    upper(substring(COALESCE(source_url, '') FROM 'PCT-[0-9]+')) = 'PCT-506'
    OR upper(substring(title FROM 'PCT-[0-9]+')) = 'PCT-506'
    OR title ~* 'NDA review'
  );

ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
