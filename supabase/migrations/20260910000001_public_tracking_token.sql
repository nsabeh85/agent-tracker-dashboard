-- Unguessable share token per request. Anonymous visitors may only read one
-- request through get_public_agent; they cannot query tracker tables.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS public_token text;

UPDATE public.agents
SET public_token = encode(gen_random_bytes(16), 'hex')
WHERE public_token IS NULL;

ALTER TABLE public.agents
  ALTER COLUMN public_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.agents
  ALTER COLUMN public_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agents_public_token_unique
  ON public.agents (public_token);

ALTER TABLE public.agents
  DROP CONSTRAINT IF EXISTS agents_public_token_hex;

ALTER TABLE public.agents
  ADD CONSTRAINT agents_public_token_hex CHECK (public_token ~ '^[0-9a-f]{32}$');

COMMENT ON COLUMN public.agents.public_token IS
  'Unguessable token for the view-only /track/:token page. Lives until the agent row is deleted.';

CREATE OR REPLACE FUNCTION public.get_public_agent(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_payload jsonb;
BEGIN
  v_token := lower(btrim(COALESCE(p_token, '')));
  IF v_token !~ '^[0-9a-f]{32}$' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'title', agent.title,
    'description', agent.description,
    'source_url', agent.source_url,
    'requester_name', agent.requester_name,
    'requester_department', agent.requester_department,
    'priority', agent.priority,
    'status', agent.status,
    'owners', agent.assigned_to,
    'current_stage_id', agent.current_stage_id,
    'target_go_live', agent.target_go_live,
    'created_at', agent.created_at,
    'stages', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', agent_stage.id,
            'stage_id', stage.id,
            'name', stage.name,
            'sort_order', stage.sort_order,
            'status', agent_stage.status,
            'expected_duration_days', agent_stage.expected_duration_days,
            'actual_start', agent_stage.actual_start,
            'actual_end', agent_stage.actual_end
          )
          ORDER BY stage.sort_order
        ),
        '[]'::jsonb
      )
      FROM public.agent_stages AS agent_stage
      JOIN public.stages AS stage ON stage.id = agent_stage.stage_id
      WHERE agent_stage.agent_id = agent.id
    ),
    'substeps', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', agent_substep.id,
            'agent_stage_id', agent_substep.agent_stage_id,
            'name', agent_substep.name,
            'sort_order', agent_substep.sort_order,
            'status', agent_substep.status
          )
          ORDER BY agent_substep.sort_order, agent_substep.name
        ),
        '[]'::jsonb
      )
      FROM public.agent_substeps AS agent_substep
      WHERE agent_substep.agent_id = agent.id
    )
  )
  INTO v_payload
  FROM public.agents AS agent
  WHERE agent.public_token = v_token;

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent(text) TO anon, authenticated;
