-- Copilot Studio Agent Tracker: schema, enums, triggers, and create_agent RPC.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.agent_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.agent_status AS ENUM ('pending_approval', 'active', 'on_hold', 'cancelled', 'complete');
CREATE TYPE public.progress_status AS ENUM ('not_started', 'in_progress', 'complete', 'blocked');

CREATE TABLE public.stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL,
  default_duration_days int NOT NULL DEFAULT 7,
  CONSTRAINT stages_sort_order_unique UNIQUE (sort_order)
);

CREATE TABLE public.substeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.stages (id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL,
  default_duration_days int NULL
);

CREATE TABLE public.admins (
  email text PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  requester_name text NOT NULL,
  requester_department text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority public.agent_priority NOT NULL DEFAULT 'medium',
  current_stage_id uuid NOT NULL REFERENCES public.stages (id),
  target_go_live date NULL,
  assigned_to text NOT NULL,
  status public.agent_status NOT NULL DEFAULT 'pending_approval',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  stage_id uuid NOT NULL REFERENCES public.stages (id),
  expected_duration_days int NOT NULL,
  actual_start date NULL,
  actual_end date NULL,
  status public.progress_status NOT NULL DEFAULT 'not_started',
  CONSTRAINT agent_stages_agent_stage_unique UNIQUE (agent_id, stage_id)
);

CREATE TABLE public.agent_substeps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  agent_stage_id uuid NOT NULL REFERENCES public.agent_stages (id) ON DELETE CASCADE,
  substep_id uuid NOT NULL REFERENCES public.substeps (id),
  name text NOT NULL,
  sort_order int NOT NULL,
  status public.progress_status NOT NULL DEFAULT 'not_started',
  actual_start date NULL,
  actual_end date NULL
);

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  agent_stage_id uuid NULL REFERENCES public.agent_stages (id) ON DELETE SET NULL,
  author_email text NOT NULL,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agent_stages_agent_id_idx ON public.agent_stages (agent_id);
CREATE INDEX agent_substeps_agent_id_idx ON public.agent_substeps (agent_id);
CREATE INDEX agent_substeps_agent_stage_id_idx ON public.agent_substeps (agent_stage_id);
CREATE INDEX comments_agent_id_idx ON public.comments (agent_id);
CREATE INDEX agents_current_stage_id_idx ON public.agents (current_stage_id);
CREATE INDEX substeps_stage_id_idx ON public.substeps (stage_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agents_set_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

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

GRANT EXECUTE ON FUNCTION public.create_agent(
  text, text, text, text, public.agent_priority, date, text
) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_agent(
  text, text, text, text, public.agent_priority, date, text
) FROM anon, public;
