-- Azure PostgreSQL (psql-agtracker01). This file is schema history applied to Azure,
-- not a Supabase project change.
-- Justin Taylor or Ajay Sudra can update cost saved on a live agent.
-- Other editors may set an estimate when the agent is created, and cannot change it later.
-- Check-in rows count completed calendar months, matching the monthly anniversary.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'savings_checkins'
      AND column_name = 'period_days'
  ) THEN
    ALTER TABLE public.savings_checkins DROP CONSTRAINT IF EXISTS savings_checkins_period;
    ALTER TABLE public.savings_checkins RENAME COLUMN period_days TO period_months;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'savings_checkins'
      AND column_name = 'period_months'
  ) THEN
    ALTER TABLE public.savings_checkins DROP CONSTRAINT IF EXISTS savings_checkins_period;
    ALTER TABLE public.savings_checkins
      ADD CONSTRAINT savings_checkins_period CHECK (period_months >= 1);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_agent_savings(
  p_agent_id uuid,
  p_amount numeric,
  p_cadence text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) NOT IN (
    'jtaylor@digitalrealty.com',
    'asudra@digitalrealty.com'
  ) THEN
    RAISE EXCEPTION 'Only Justin Taylor or Ajay Sudra can update cost saved';
  END IF;
  IF p_amount IS NOT NULL AND p_amount < 0 THEN
    RAISE EXCEPTION 'Money saved must be 0 or greater';
  END IF;
  IF p_cadence NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Savings period must be monthly or yearly';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.agents AS agent
    JOIN public.stages AS current_stage ON current_stage.id = agent.current_stage_id
    WHERE agent.id = p_agent_id
      AND agent.status NOT IN ('complete', 'cancelled')
      AND current_stage.sort_order = (SELECT max(sort_order) FROM public.stages)
  ) THEN
    RAISE EXCEPTION 'Cost saved is updated once an agent is live';
  END IF;

  UPDATE public.agents
  SET savings_amount = p_amount,
      savings_cadence = p_cadence::public.savings_cadence
  WHERE id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_agent_savings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.savings_amount IS NOT DISTINCT FROM OLD.savings_amount
     AND NEW.savings_cadence IS NOT DISTINCT FROM OLD.savings_cadence THEN
    RETURN NEW;
  END IF;
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) IN (
    'jtaylor@digitalrealty.com',
    'asudra@digitalrealty.com'
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only Justin Taylor or Ajay Sudra can update cost saved';
END;
$$;

DROP TRIGGER IF EXISTS agents_protect_savings ON public.agents;
CREATE TRIGGER agents_protect_savings
  BEFORE UPDATE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_agent_savings();
