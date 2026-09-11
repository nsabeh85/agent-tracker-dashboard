-- Include tracker comments on the view-only tracking page.
-- Anonymous visitors still cannot insert comments or query the comments table.

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
    ),
    'comments', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', comment.id,
            'author_name', comment.author_name,
            'body', comment.body,
            'created_at', comment.created_at,
            'agent_stage_id', comment.agent_stage_id
          )
          ORDER BY comment.created_at
        ),
        '[]'::jsonb
      )
      FROM public.comments AS comment
      WHERE comment.agent_id = agent.id
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
