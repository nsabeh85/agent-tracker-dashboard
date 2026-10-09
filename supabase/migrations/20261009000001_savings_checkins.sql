-- One row per 30-day production check-in, so the same note is not sent twice.
-- Digital Realty users can record the cost saved without becoming full editors.

CREATE TABLE IF NOT EXISTS public.savings_checkins (
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  period_days integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, period_days),
  CONSTRAINT savings_checkins_period CHECK (period_days >= 30 AND period_days % 30 = 0)
);

ALTER TABLE public.savings_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS savings_checkins_select ON public.savings_checkins;
CREATE POLICY savings_checkins_select ON public.savings_checkins
  FOR SELECT TO authenticated
  USING (public.is_dlr_user());

GRANT SELECT ON public.savings_checkins TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auth_service') THEN
    GRANT SELECT, INSERT, DELETE ON public.savings_checkins TO auth_service;
    EXECUTE 'DROP POLICY IF EXISTS savings_checkins_api ON public.savings_checkins';
    EXECUTE 'CREATE POLICY savings_checkins_api ON public.savings_checkins FOR ALL TO auth_service USING (true) WITH CHECK (true)';
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
  IF NOT public.is_dlr_user() THEN
    RAISE EXCEPTION 'Digital Realty access required';
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
      AND agent.status = 'active'
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

REVOKE ALL ON FUNCTION public.set_agent_savings(uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_agent_savings(uuid, numeric, text) TO authenticated;
