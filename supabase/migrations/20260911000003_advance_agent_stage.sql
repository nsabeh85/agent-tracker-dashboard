-- Admin fallback: complete remaining current-stage items (or skip an empty
-- stage) and move the tracker forward. Item-by-item completion remains the
-- normal path.

CREATE OR REPLACE FUNCTION public.advance_agent_stage(
  p_agent_id uuid,
  p_agent_stage_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_current_stage_id uuid;
  v_stage_id uuid;
  v_stage_sort_order int;
  v_next_agent_stage_id uuid;
  v_next_stage_id uuid;
  v_next_stage_name text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT current_stage_id
  INTO v_current_stage_id
  FROM public.agents
  WHERE id = p_agent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  SELECT agent_stage.stage_id, stage.sort_order
  INTO v_stage_id, v_stage_sort_order
  FROM public.agent_stages AS agent_stage
  JOIN public.stages AS stage ON stage.id = agent_stage.stage_id
  WHERE agent_stage.id = p_agent_stage_id
    AND agent_stage.agent_id = p_agent_id
  FOR UPDATE OF agent_stage;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent stage not found';
  END IF;

  IF v_stage_id <> v_current_stage_id THEN
    RETURN v_current_stage_id;
  END IF;

  PERFORM 1
  FROM public.agent_substeps
  WHERE agent_stage_id = p_agent_stage_id
  FOR UPDATE;

  UPDATE public.agent_substeps
  SET status = 'complete',
      actual_start = COALESCE(actual_start, CURRENT_DATE),
      actual_end = COALESCE(actual_end, CURRENT_DATE)
  WHERE agent_stage_id = p_agent_stage_id
    AND status <> 'complete';

  SELECT next_agent_stage.id, next_agent_stage.stage_id, next_stage.name
  INTO v_next_agent_stage_id, v_next_stage_id, v_next_stage_name
  FROM public.agent_stages AS next_agent_stage
  JOIN public.stages AS next_stage ON next_stage.id = next_agent_stage.stage_id
  WHERE next_agent_stage.agent_id = p_agent_id
    AND next_stage.sort_order > v_stage_sort_order
  ORDER BY next_stage.sort_order
  LIMIT 1
  FOR UPDATE OF next_agent_stage;

  IF v_next_stage_name = 'Testing' AND (
    SELECT target_go_live FROM public.agents WHERE id = p_agent_id
  ) IS NULL THEN
    RAISE EXCEPTION 'Set a target go-live date before a request can enter Testing.';
  END IF;

  UPDATE public.agent_stages
  SET status = 'complete',
      actual_end = COALESCE(actual_end, CURRENT_DATE)
  WHERE id = p_agent_stage_id;

  IF v_next_agent_stage_id IS NULL THEN
    UPDATE public.agents SET status = 'complete' WHERE id = p_agent_id;
    RETURN v_current_stage_id;
  END IF;

  UPDATE public.agent_stages
  SET status = 'not_started',
      actual_start = NULL,
      actual_end = NULL
  WHERE id = v_next_agent_stage_id;

  UPDATE public.agents
  SET current_stage_id = v_next_stage_id
  WHERE id = p_agent_id;

  RETURN v_next_stage_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_agent_stage(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_agent_stage(uuid, uuid) TO authenticated;
