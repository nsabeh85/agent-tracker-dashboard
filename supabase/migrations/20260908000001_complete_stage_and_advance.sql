-- Complete the current stage and advance its agent in one transaction.
-- The row locks and current-stage check make repeated or concurrent calls idempotent.

CREATE OR REPLACE FUNCTION public.complete_stage_and_advance(
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
BEGIN
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

  -- The tracker has already moved, so this completion was already processed.
  IF v_stage_id <> v_current_stage_id THEN
    RETURN v_current_stage_id;
  END IF;

  -- Stabilize the completion check against concurrent item edits.
  PERFORM 1
  FROM public.agent_substeps
  WHERE agent_stage_id = p_agent_stage_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.agent_substeps
    WHERE agent_stage_id = p_agent_stage_id
      AND status <> 'complete'
  ) THEN
    RAISE EXCEPTION 'Every item in the current stage must be complete';
  END IF;

  SELECT next_agent_stage.id, next_agent_stage.stage_id
  INTO v_next_agent_stage_id, v_next_stage_id
  FROM public.agent_stages AS next_agent_stage
  JOIN public.stages AS next_stage ON next_stage.id = next_agent_stage.stage_id
  WHERE next_agent_stage.agent_id = p_agent_id
    AND next_stage.sort_order > v_stage_sort_order
  ORDER BY next_stage.sort_order
  LIMIT 1
  FOR UPDATE OF next_agent_stage;

  UPDATE public.agent_stages
  SET status = 'complete',
      actual_end = COALESCE(actual_end, CURRENT_DATE)
  WHERE id = p_agent_stage_id;

  IF v_next_agent_stage_id IS NULL THEN
    RETURN v_current_stage_id;
  END IF;

  UPDATE public.agent_stages
  SET status = 'in_progress',
      actual_start = COALESCE(actual_start, CURRENT_DATE)
  WHERE id = v_next_agent_stage_id;

  UPDATE public.agents
  SET current_stage_id = v_next_stage_id
  WHERE id = p_agent_id;

  RETURN v_next_stage_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_stage_and_advance(uuid, uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_stage_and_advance(uuid, uuid)
  TO anon, authenticated;
