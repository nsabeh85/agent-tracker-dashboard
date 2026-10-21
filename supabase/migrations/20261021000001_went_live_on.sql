-- Record the day an agent went live on the agent itself.
-- Apply to Azure PostgreSQL (psql-agtracker01), not a Supabase project.
-- The date comes from the Live stage start. A target go-live date is not copied.

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS went_live_on date;

CREATE OR REPLACE FUNCTION public.sync_went_live_on_from_agent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_live uuid;
  v_start date;
BEGIN
  IF current_setting('tracker.syncing_went_live', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_live FROM public.stages ORDER BY sort_order DESC LIMIT 1;

  IF v_live IS NULL OR NEW.current_stage_id IS DISTINCT FROM v_live THEN
    NEW.went_live_on := NULL;
    RETURN NEW;
  END IF;

  SELECT agent_stage.actual_start
  INTO v_start
  FROM public.agent_stages AS agent_stage
  WHERE agent_stage.agent_id = NEW.id
    AND agent_stage.stage_id = v_live;

  IF v_start IS NULL THEN
    SELECT prior.actual_end
    INTO v_start
    FROM public.agent_stages AS prior
    JOIN public.stages AS prior_stage ON prior_stage.id = prior.stage_id
    WHERE prior.agent_id = NEW.id
      AND prior_stage.sort_order < (
        SELECT live_stage.sort_order FROM public.stages AS live_stage WHERE live_stage.id = v_live
      )
      AND prior.actual_end IS NOT NULL
    ORDER BY prior_stage.sort_order DESC
    LIMIT 1;
  END IF;

  IF v_start IS NULL AND (
    TG_OP = 'INSERT'
    OR OLD.current_stage_id IS DISTINCT FROM NEW.current_stage_id
  ) THEN
    v_start := CURRENT_DATE;
    PERFORM set_config('tracker.syncing_went_live', '1', true);
    UPDATE public.agent_stages
    SET actual_start = v_start
    WHERE agent_id = NEW.id
      AND stage_id = v_live
      AND actual_start IS NULL;
    PERFORM set_config('tracker.syncing_went_live', '0', true);
  END IF;

  NEW.went_live_on := v_start;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_went_live_on_from_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_live uuid;
BEGIN
  IF current_setting('tracker.syncing_went_live', true) = '1' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_live FROM public.stages ORDER BY sort_order DESC LIMIT 1;
  IF v_live IS NULL OR NEW.stage_id IS DISTINCT FROM v_live THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.actual_start IS NOT DISTINCT FROM OLD.actual_start THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('tracker.syncing_went_live', '1', true);
  UPDATE public.agents
  SET went_live_on = NEW.actual_start
  WHERE id = NEW.agent_id
    AND current_stage_id = v_live
    AND went_live_on IS DISTINCT FROM NEW.actual_start;
  PERFORM set_config('tracker.syncing_went_live', '0', true);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agents_sync_went_live ON public.agents;
CREATE TRIGGER agents_sync_went_live
  BEFORE INSERT OR UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_went_live_on_from_agent();

DROP TRIGGER IF EXISTS agent_stages_sync_went_live ON public.agent_stages;
CREATE TRIGGER agent_stages_sync_went_live
  AFTER INSERT OR UPDATE OF actual_start, stage_id ON public.agent_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_went_live_on_from_stage();

ALTER TABLE public.agents DISABLE TRIGGER agents_set_updated_at;
UPDATE public.agents
SET went_live_on = went_live_on
WHERE current_stage_id = (
  SELECT id FROM public.stages ORDER BY sort_order DESC LIMIT 1
);
ALTER TABLE public.agents ENABLE TRIGGER agents_set_updated_at;
