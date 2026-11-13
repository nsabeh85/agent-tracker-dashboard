-- Azure PostgreSQL (psql-agtracker01). This file is schema history applied to Azure,
-- not a Supabase project change.
-- An administrator can set cost saved from Edit details on an existing agent.
-- Justin Taylor and Ajay Sudra can still update it from the live cost form.

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
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF lower(COALESCE(auth.jwt() ->> 'email', '')) IN (
    'jtaylor@digitalrealty.com',
    'asudra@digitalrealty.com'
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only an administrator, Justin Taylor, or Ajay Sudra can update cost saved';
END;
$$;
