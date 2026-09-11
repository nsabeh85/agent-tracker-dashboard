-- Keep item, stage, and agent progress synchronized in one transaction.
-- Reopening an earlier stage resets later work so stages cannot be skipped.

CREATE OR REPLACE FUNCTION public.set_agent_substep_status(
  p_agent_substep_id uuid,
  p_status public.progress_status
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_agent_stage_id uuid;
  v_stage_id uuid;
  v_current_stage_id uuid;
  v_previous_item_status public.progress_status;
  v_stage_sort_order int;
  v_current_sort_order int;
  v_item_count int;
  v_complete_count int;
  v_started_count int;
  v_has_blocked boolean;
  v_stage_status public.progress_status;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT agent_substep.agent_id,
         agent_substep.agent_stage_id,
         agent_stage.stage_id,
         agent.current_stage_id,
         agent_substep.status,
         stage.sort_order,
         current_stage.sort_order
  INTO v_agent_id,
       v_agent_stage_id,
       v_stage_id,
       v_current_stage_id,
       v_previous_item_status,
       v_stage_sort_order,
       v_current_sort_order
  FROM public.agent_substeps AS agent_substep
  JOIN public.agent_stages AS agent_stage
    ON agent_stage.id = agent_substep.agent_stage_id
  JOIN public.agents AS agent
    ON agent.id = agent_substep.agent_id
  JOIN public.stages AS stage
    ON stage.id = agent_stage.stage_id
  JOIN public.stages AS current_stage
    ON current_stage.id = agent.current_stage_id
  WHERE agent_substep.id = p_agent_substep_id
  FOR UPDATE OF agent_substep, agent_stage, agent;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent item not found';
  END IF;

  IF v_stage_sort_order > v_current_sort_order THEN
    RAISE EXCEPTION 'Finish the current stage before changing a later stage';
  END IF;

  IF v_stage_sort_order < v_current_sort_order THEN
    -- A repeated completion after auto-advance is harmless.
    IF v_previous_item_status = p_status THEN
      RETURN v_current_stage_id;
    END IF;
    -- Past work may only be unchecked, which explicitly reopens that stage.
    IF v_previous_item_status <> 'complete' OR p_status <> 'not_started' THEN
      RAISE EXCEPTION 'Reopen the earlier stage before changing its unfinished items';
    END IF;
  END IF;

  -- Serialize item changes within this stage before deriving its status.
  PERFORM 1
  FROM public.agent_substeps
  WHERE agent_stage_id = v_agent_stage_id
  FOR UPDATE;

  UPDATE public.agent_substeps
  SET status = p_status,
      actual_start = CASE
        WHEN p_status = 'not_started' THEN NULL
        ELSE COALESCE(actual_start, CURRENT_DATE)
      END,
      actual_end = CASE
        WHEN p_status = 'complete' THEN COALESCE(actual_end, CURRENT_DATE)
        ELSE NULL
      END
  WHERE id = p_agent_substep_id;

  SELECT count(*),
         count(*) FILTER (WHERE status = 'complete'),
         count(*) FILTER (WHERE status <> 'not_started'),
         COALESCE(bool_or(status = 'blocked'), false)
  INTO v_item_count, v_complete_count, v_started_count, v_has_blocked
  FROM public.agent_substeps
  WHERE agent_stage_id = v_agent_stage_id;

  v_stage_status := CASE
    WHEN v_item_count = 0 OR v_started_count = 0 THEN 'not_started'
    WHEN v_complete_count = v_item_count THEN 'complete'
    WHEN v_has_blocked THEN 'blocked'
    ELSE 'in_progress'
  END;

  IF v_stage_status = 'complete' THEN
    RETURN public.complete_stage_and_advance(v_agent_id, v_agent_stage_id);
  END IF;

  IF v_stage_sort_order < v_current_sort_order THEN
    -- Reopening earlier work invalidates every later stage and its item dates.
    UPDATE public.agent_substeps AS later_item
    SET status = 'not_started',
        actual_start = NULL,
        actual_end = NULL
    FROM public.agent_stages AS later_agent_stage
    JOIN public.stages AS later_stage
      ON later_stage.id = later_agent_stage.stage_id
    WHERE later_item.agent_stage_id = later_agent_stage.id
      AND later_agent_stage.agent_id = v_agent_id
      AND later_stage.sort_order > v_stage_sort_order;

    UPDATE public.agent_stages AS later_agent_stage
    SET status = 'not_started',
        actual_start = NULL,
        actual_end = NULL
    FROM public.stages AS later_stage
    WHERE later_agent_stage.stage_id = later_stage.id
      AND later_agent_stage.agent_id = v_agent_id
      AND later_stage.sort_order > v_stage_sort_order;
  END IF;

  UPDATE public.agent_stages
  SET status = v_stage_status,
      actual_start = CASE
        WHEN v_stage_status = 'not_started' THEN NULL
        ELSE COALESCE(actual_start, CURRENT_DATE)
      END,
      actual_end = NULL
  WHERE id = v_agent_stage_id;

  UPDATE public.agents
  SET current_stage_id = CASE
        WHEN v_stage_sort_order < v_current_sort_order THEN v_stage_id
        ELSE current_stage_id
      END,
      status = CASE WHEN status = 'complete' THEN 'active' ELSE status END
  WHERE id = v_agent_id;

  RETURN CASE
    WHEN v_stage_sort_order < v_current_sort_order THEN v_stage_id
    ELSE v_current_stage_id
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_agent_stage(
  p_agent_id uuid,
  p_agent_stage_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_stage_id uuid;
  v_stage_sort_order int;
  v_current_sort_order int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  SELECT agent_stage.stage_id, stage.sort_order, current_stage.sort_order
  INTO v_stage_id, v_stage_sort_order, v_current_sort_order
  FROM public.agent_stages AS agent_stage
  JOIN public.stages AS stage ON stage.id = agent_stage.stage_id
  JOIN public.agents AS agent ON agent.id = agent_stage.agent_id
  JOIN public.stages AS current_stage ON current_stage.id = agent.current_stage_id
  WHERE agent_stage.id = p_agent_stage_id
    AND agent_stage.agent_id = p_agent_id
  FOR UPDATE OF agent_stage, agent;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agent stage not found';
  END IF;

  IF v_stage_sort_order >= v_current_sort_order THEN
    RAISE EXCEPTION 'Only an earlier stage can be reopened';
  END IF;

  UPDATE public.agent_substeps AS item
  SET status = 'not_started',
      actual_start = NULL,
      actual_end = NULL
  FROM public.agent_stages AS agent_stage
  JOIN public.stages AS stage ON stage.id = agent_stage.stage_id
  WHERE item.agent_stage_id = agent_stage.id
    AND agent_stage.agent_id = p_agent_id
    AND stage.sort_order >= v_stage_sort_order;

  UPDATE public.agent_stages AS agent_stage
  SET status = 'not_started',
      actual_start = NULL,
      actual_end = NULL
  FROM public.stages AS stage
  WHERE agent_stage.stage_id = stage.id
    AND agent_stage.agent_id = p_agent_id
    AND stage.sort_order >= v_stage_sort_order;

  UPDATE public.agents
  SET current_stage_id = v_stage_id,
      status = CASE WHEN status = 'complete' THEN 'active' ELSE status END
  WHERE id = p_agent_id;

  RETURN v_stage_id;
END;
$$;

-- Finishing every item in Live finishes the agent as well.
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

  -- Repeated calls after an automatic advance are idempotent.
  IF v_stage_id <> v_current_stage_id THEN
    RETURN v_current_stage_id;
  END IF;

  PERFORM 1
  FROM public.agent_substeps
  WHERE agent_stage_id = p_agent_stage_id
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.agent_substeps WHERE agent_stage_id = p_agent_stage_id
  ) THEN
    RAISE EXCEPTION 'A stage with no items cannot be completed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.agent_substeps
    WHERE agent_stage_id = p_agent_stage_id
      AND status <> 'complete'
  ) THEN
    RAISE EXCEPTION 'Every item in the current stage must be complete';
  END IF;

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

REVOKE ALL ON FUNCTION public.set_agent_substep_status(
  uuid, public.progress_status
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reopen_agent_stage(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_agent_substep_status(
  uuid, public.progress_status
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_agent_stage(uuid, uuid) TO authenticated;
