-- Manual estimated savings per agent. Totals annualize monthly values so mixed
-- cadences can be summed. Amounts are USD; empty means "not estimated yet".

DO $$
BEGIN
  CREATE TYPE public.savings_cadence AS ENUM ('monthly', 'yearly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS savings_amount numeric(14, 2) NULL;

ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS savings_cadence public.savings_cadence NOT NULL DEFAULT 'yearly';

ALTER TABLE public.agents
DROP CONSTRAINT IF EXISTS agents_savings_amount_non_negative;

ALTER TABLE public.agents
ADD CONSTRAINT agents_savings_amount_non_negative CHECK (
  savings_amount IS NULL OR savings_amount >= 0
);
