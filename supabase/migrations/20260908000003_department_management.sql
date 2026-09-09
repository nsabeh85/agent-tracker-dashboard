-- Managed department catalog. Keep requester_department as a text summary so
-- existing integrations and historical rows remain compatible.

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT departments_name_trimmed CHECK (name = btrim(name)),
  CONSTRAINT departments_name_not_empty CHECK (name <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS departments_name_lower_unique
  ON public.departments (lower(name));

INSERT INTO public.departments (name, sort_order)
SELECT source.name, row_number() OVER (ORDER BY lower(source.name))
FROM (
  SELECT min(btrim(requester_department)) AS name
  FROM public.agents
  WHERE btrim(requester_department) <> ''
  GROUP BY lower(btrim(requester_department))
) AS source
ON CONFLICT (lower(name)) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_department_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE public.agents
    SET requester_department = NEW.name
    WHERE lower(btrim(requester_department)) = lower(OLD.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS departments_sync_name ON public.departments;
CREATE TRIGGER departments_sync_name
AFTER UPDATE OF name ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.sync_department_name();

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY departments_select ON public.departments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY departments_insert ON public.departments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY departments_update ON public.departments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.departments TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
