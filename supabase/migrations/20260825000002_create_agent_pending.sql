-- Recreate create_agent after pending_approval exists: new requests stay
-- in Requested with no clock running until an admin marks them active.

ALTER TABLE public.agents ALTER COLUMN status SET DEFAULT 'pending_approval';

CREATE OR REPLACE FUNCTION public.create_agent(
  p_title text,
  p_requester_name text,
  p_requester_department text,
  p_description text,
  p_priority public.agent_priority,
  p_target_go_live date,
  p_assigned_to text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_first_stage_id uuid;
  v_stage record;
  v_agent_stage_id uuid;
  v_substep record;
BEGIN
  SELECT id INTO v_first_stage_id
  FROM public.stages
  ORDER BY sort_order ASC
  LIMIT 1;

  IF v_first_stage_id IS NULL THEN
    RAISE EXCEPTION 'No stages exist in the catalog';
  END IF;

  INSERT INTO public.agents (
    title,
    requester_name,
    requester_department,
    description,
    priority,
    current_stage_id,
    target_go_live,
    assigned_to,
    status
  ) VALUES (
    p_title,
    p_requester_name,
    p_requester_department,
    p_description,
    p_priority,
    v_first_stage_id,
    p_target_go_live,
    p_assigned_to,
    'pending_approval'
  )
  RETURNING id INTO v_agent_id;

  FOR v_stage IN
    SELECT * FROM public.stages ORDER BY sort_order ASC
  LOOP
    INSERT INTO public.agent_stages (
      agent_id,
      stage_id,
      expected_duration_days,
      actual_start,
      status
    ) VALUES (
      v_agent_id,
      v_stage.id,
      v_stage.default_duration_days,
      NULL,
      'not_started'
    )
    RETURNING id INTO v_agent_stage_id;

    FOR v_substep IN
      SELECT * FROM public.substeps
      WHERE stage_id = v_stage.id
      ORDER BY sort_order ASC
    LOOP
      INSERT INTO public.agent_substeps (
        agent_id,
        agent_stage_id,
        substep_id,
        name,
        sort_order,
        status
      ) VALUES (
        v_agent_id,
        v_agent_stage_id,
        v_substep.id,
        v_substep.name,
        v_substep.sort_order,
        'not_started'
      );
    END LOOP;
  END LOOP;

  RETURN v_agent_id;
END;
$$;
