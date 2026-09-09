-- Managed owners, multiple agent owners, and stage-specific owners.
-- Keep agents.assigned_to as a denormalized summary for backward compatibility.

CREATE TABLE IF NOT EXISTS public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT owners_full_name_trimmed CHECK (full_name = btrim(full_name)),
  CONSTRAINT owners_first_last_name CHECK (
    full_name ~ '^[^[:space:]]+[[:space:]]+[^[:space:]]+'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS owners_full_name_lower_unique
  ON public.owners (lower(full_name));

CREATE TABLE IF NOT EXISTS public.agent_owners (
  agent_id uuid NOT NULL REFERENCES public.agents (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.owners (id) ON DELETE RESTRICT,
  PRIMARY KEY (agent_id, owner_id)
);

CREATE TABLE IF NOT EXISTS public.agent_stage_owners (
  agent_stage_id uuid NOT NULL REFERENCES public.agent_stages (id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.owners (id) ON DELETE RESTRICT,
  PRIMARY KEY (agent_stage_id, owner_id)
);

INSERT INTO public.owners (full_name, sort_order)
VALUES
  ('Lauren Lawhon', 1),
  ('Nabih Sabeh', 2),
  ('Mark Seay', 3)
ON CONFLICT (lower(full_name)) DO UPDATE
SET active = true,
    sort_order = EXCLUDED.sort_order;

UPDATE public.agents
SET assigned_to = CASE lower(btrim(assigned_to))
  WHEN 'lauren' THEN 'Lauren Lawhon'
  WHEN 'lauren law-hon' THEN 'Lauren Lawhon'
  WHEN 'nabih' THEN 'Nabih Sabeh'
  WHEN 'mark' THEN 'Mark Seay'
  ELSE assigned_to
END
WHERE lower(btrim(assigned_to)) IN ('lauren', 'lauren law-hon', 'nabih', 'mark');

INSERT INTO public.agent_owners (agent_id, owner_id)
SELECT agent.id, owner.id
FROM public.agents AS agent
JOIN public.owners AS owner ON lower(owner.full_name) = lower(btrim(agent.assigned_to))
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_stage_owners (agent_stage_id, owner_id)
SELECT agent_stage.id, agent_owner.owner_id
FROM public.agent_owners AS agent_owner
JOIN public.agent_stages AS agent_stage
  ON agent_stage.agent_id = agent_owner.agent_id
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.refresh_agent_owner_summaries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agents AS agent
  SET assigned_to = summary.names
  FROM (
    SELECT agent_owner.agent_id,
           string_agg(owner.full_name, ', ' ORDER BY owner.sort_order, owner.full_name) AS names
    FROM public.agent_owners AS agent_owner
    JOIN public.owners AS owner ON owner.id = agent_owner.owner_id
    WHERE agent_owner.owner_id = NEW.id
    GROUP BY agent_owner.agent_id
  ) AS summary
  WHERE agent.id = summary.agent_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS owners_refresh_agent_summaries ON public.owners;
CREATE TRIGGER owners_refresh_agent_summaries
AFTER UPDATE OF full_name, sort_order ON public.owners
FOR EACH ROW
EXECUTE FUNCTION public.refresh_agent_owner_summaries();

CREATE OR REPLACE FUNCTION public.set_agent_owners(
  p_agent_id uuid,
  p_owner_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_ids uuid[];
  v_owner_summary text;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT owner_id), ARRAY[]::uuid[])
  INTO v_owner_ids
  FROM unnest(COALESCE(p_owner_ids, ARRAY[]::uuid[])) AS owner_id;

  IF cardinality(v_owner_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one owner';
  END IF;

  IF (
    SELECT count(*)
    FROM public.owners
    WHERE id = ANY(v_owner_ids)
      AND active
  ) <> cardinality(v_owner_ids) THEN
    RAISE EXCEPTION 'Every selected owner must be active';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.agents WHERE id = p_agent_id FOR UPDATE) THEN
    RAISE EXCEPTION 'Agent not found';
  END IF;

  DELETE FROM public.agent_owners WHERE agent_id = p_agent_id;
  INSERT INTO public.agent_owners (agent_id, owner_id)
  SELECT p_agent_id, unnest(v_owner_ids);

  SELECT string_agg(full_name, ', ' ORDER BY sort_order, full_name)
  INTO v_owner_summary
  FROM public.owners
  WHERE id = ANY(v_owner_ids);

  UPDATE public.agents
  SET assigned_to = v_owner_summary
  WHERE id = p_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_agent_stage_owners(
  p_agent_stage_id uuid,
  p_owner_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT owner_id), ARRAY[]::uuid[])
  INTO v_owner_ids
  FROM unnest(COALESCE(p_owner_ids, ARRAY[]::uuid[])) AS owner_id;

  IF (
    SELECT count(*)
    FROM public.owners
    WHERE id = ANY(v_owner_ids)
      AND active
  ) <> cardinality(v_owner_ids) THEN
    RAISE EXCEPTION 'Every selected owner must be active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.agent_stages WHERE id = p_agent_stage_id FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'Agent stage not found';
  END IF;

  DELETE FROM public.agent_stage_owners WHERE agent_stage_id = p_agent_stage_id;
  INSERT INTO public.agent_stage_owners (agent_stage_id, owner_id)
  SELECT p_agent_stage_id, unnest(v_owner_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_agent_with_owners(
  p_title text,
  p_requester_name text,
  p_requester_department text,
  p_description text,
  p_priority public.agent_priority,
  p_target_go_live date,
  p_owner_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_owner_ids uuid[];
  v_owner_summary text;
BEGIN
  SELECT COALESCE(array_agg(DISTINCT owner_id), ARRAY[]::uuid[])
  INTO v_owner_ids
  FROM unnest(COALESCE(p_owner_ids, ARRAY[]::uuid[])) AS owner_id;

  IF cardinality(v_owner_ids) = 0 THEN
    RAISE EXCEPTION 'Select at least one owner';
  END IF;

  IF (
    SELECT count(*)
    FROM public.owners
    WHERE id = ANY(v_owner_ids)
      AND active
  ) <> cardinality(v_owner_ids) THEN
    RAISE EXCEPTION 'Every selected owner must be active';
  END IF;

  SELECT string_agg(full_name, ', ' ORDER BY sort_order, full_name)
  INTO v_owner_summary
  FROM public.owners
  WHERE id = ANY(v_owner_ids);

  v_agent_id := public.create_agent(
    p_title,
    p_requester_name,
    p_requester_department,
    p_description,
    p_priority,
    p_target_go_live,
    v_owner_summary
  );

  INSERT INTO public.agent_owners (agent_id, owner_id)
  SELECT v_agent_id, unnest(v_owner_ids);

  INSERT INTO public.agent_stage_owners (agent_stage_id, owner_id)
  SELECT agent_stage.id, selected.owner_id
  FROM public.agent_stages AS agent_stage
  CROSS JOIN unnest(v_owner_ids) AS selected(owner_id)
  WHERE agent_stage.agent_id = v_agent_id;

  RETURN v_agent_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_owner(p_full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_id uuid;
BEGIN
  v_name := btrim(regexp_replace(COALESCE(p_full_name, ''), '\s+', ' ', 'g'));
  IF v_name !~ '^[^[:space:]]+[[:space:]]+[^[:space:]]+' THEN
    RAISE EXCEPTION 'Enter both a first and last name';
  END IF;

  INSERT INTO public.owners (full_name, sort_order)
  SELECT v_name, COALESCE(max(sort_order), 0) + 1
  FROM public.owners
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_owner(p_owner_id uuid, p_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := btrim(regexp_replace(COALESCE(p_full_name, ''), '\s+', ' ', 'g'));
  IF v_name !~ '^[^[:space:]]+[[:space:]]+[^[:space:]]+' THEN
    RAISE EXCEPTION 'Enter both a first and last name';
  END IF;

  UPDATE public.owners
  SET full_name = v_name
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owner not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_owner_active(p_owner_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.owners
  SET active = p_active
  WHERE id = p_owner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Owner not found';
  END IF;
END;
$$;

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stage_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY owners_select ON public.owners
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY agent_owners_select ON public.agent_owners
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY agent_stage_owners_select ON public.agent_stage_owners
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.owners, public.agent_owners, public.agent_stage_owners
  TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.owners FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agent_owners FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.agent_stage_owners FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.set_agent_owners(uuid, uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_agent_stage_owners(uuid, uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_with_owners(
  text, text, text, text, public.agent_priority, date, uuid[]
) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_owner(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_owner(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_owner_active(uuid, boolean) TO anon, authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE
    public.owners, public.agent_owners, public.agent_stage_owners;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;
