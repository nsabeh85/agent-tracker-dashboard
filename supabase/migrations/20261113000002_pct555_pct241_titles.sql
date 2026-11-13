-- Correct two stored agent titles to the names shown on the board.
--   PCT-555: drop the "Business Request:" prefix from the CDO intake name.
--   PCT-241: "Pre-signing Intelligent Contract Review" (the board adds the PCT key in front).
-- Rows are matched by the PCT key in source_url, or in title when source_url has none.
-- updated_at is left unchanged.
-- Rollback:
--   restore agents.title from a backup taken before this update, or set
--   PCT-555 back to 'Business Request: AI-Powered Tax Document Translation Agent with OCR and Layout Preservation'.

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;

UPDATE public.agents AS agent
SET title = CASE
  WHEN matched.issue_key = 'PCT-555'
    THEN 'AI-Powered Tax Document Translation Agent with OCR and Layout Preservation'
  WHEN matched.issue_key = 'PCT-241'
    THEN 'Pre-signing Intelligent Contract Review'
END
FROM (
  SELECT
    a.id,
    COALESCE(
      upper(substring(a.source_url FROM 'PCT-[0-9]+')),
      upper(substring(a.title FROM 'PCT-[0-9]+'))
    ) AS issue_key
  FROM public.agents AS a
) AS matched
WHERE agent.id = matched.id
  AND matched.issue_key IN ('PCT-555', 'PCT-241')
  AND agent.title IS DISTINCT FROM CASE
    WHEN matched.issue_key = 'PCT-555'
      THEN 'AI-Powered Tax Document Translation Agent with OCR and Layout Preservation'
    ELSE 'Pre-signing Intelligent Contract Review'
  END;

ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
