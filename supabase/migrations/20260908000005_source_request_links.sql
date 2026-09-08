-- Store intake/source links separately from descriptive prose.

ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS source_url text NULL;

ALTER TABLE public.agents
DROP CONSTRAINT IF EXISTS agents_source_url_https;

ALTER TABLE public.agents
ADD CONSTRAINT agents_source_url_https CHECK (
  source_url IS NULL OR source_url ~ '^https://[^[:space:]]+$'
);

UPDATE public.agents
SET source_url = substring(description FROM '(https://[^[:space:]]+)')
WHERE source_url IS NULL
  AND description ~ 'https://';

CREATE OR REPLACE FUNCTION public.create_agent_with_source(
  p_title text,
  p_requester_name text,
  p_requester_department text,
  p_description text,
  p_priority public.agent_priority,
  p_target_go_live date,
  p_assigned_to text,
  p_source_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
BEGIN
  v_agent_id := public.create_agent(
    p_title,
    p_requester_name,
    p_requester_department,
    p_description,
    p_priority,
    p_target_go_live,
    p_assigned_to
  );

  UPDATE public.agents
  SET source_url = NULLIF(btrim(p_source_url), '')
  WHERE id = v_agent_id;

  RETURN v_agent_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_agent_with_source(
  text, text, text, text, public.agent_priority, date, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agent_with_source(
  text, text, text, text, public.agent_priority, date, text, text
) TO anon, authenticated;
