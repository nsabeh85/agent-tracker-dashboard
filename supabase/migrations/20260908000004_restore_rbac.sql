-- Require a Digital Realty identity to view the tracker and an explicit
-- admins-table entry to change it.

DELETE FROM public.admins
WHERE lower(email) NOT IN (
  'llawhon@digitalrealty.com',
  'nsabeh@digitalrealty.com',
  'mseay@digitalrealty.com'
);

INSERT INTO public.admins (email, display_name)
VALUES
  ('llawhon@digitalrealty.com', 'Lauren Lawhon'),
  ('nsabeh@digitalrealty.com', 'Nabih Sabeh'),
  ('mseay@digitalrealty.com', 'Mark Seay')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name;

CREATE OR REPLACE FUNCTION public.is_dlr_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) ~ '@digitalrealty[.]com$';
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_dlr_user() AND EXISTS (
    SELECT 1
    FROM public.admins
    WHERE lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.is_dlr_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dlr_user(), public.is_admin() TO authenticated;

DROP POLICY IF EXISTS stages_select ON public.stages;
DROP POLICY IF EXISTS stages_insert ON public.stages;
DROP POLICY IF EXISTS stages_update ON public.stages;
DROP POLICY IF EXISTS stages_delete ON public.stages;
DROP POLICY IF EXISTS substeps_select ON public.substeps;
DROP POLICY IF EXISTS substeps_insert ON public.substeps;
DROP POLICY IF EXISTS substeps_update ON public.substeps;
DROP POLICY IF EXISTS substeps_delete ON public.substeps;
DROP POLICY IF EXISTS agents_select ON public.agents;
DROP POLICY IF EXISTS agents_insert ON public.agents;
DROP POLICY IF EXISTS agents_update ON public.agents;
DROP POLICY IF EXISTS agents_delete ON public.agents;
DROP POLICY IF EXISTS agent_stages_select ON public.agent_stages;
DROP POLICY IF EXISTS agent_stages_insert ON public.agent_stages;
DROP POLICY IF EXISTS agent_stages_update ON public.agent_stages;
DROP POLICY IF EXISTS agent_stages_delete ON public.agent_stages;
DROP POLICY IF EXISTS agent_substeps_select ON public.agent_substeps;
DROP POLICY IF EXISTS agent_substeps_insert ON public.agent_substeps;
DROP POLICY IF EXISTS agent_substeps_update ON public.agent_substeps;
DROP POLICY IF EXISTS agent_substeps_delete ON public.agent_substeps;
DROP POLICY IF EXISTS comments_select ON public.comments;
DROP POLICY IF EXISTS comments_insert ON public.comments;
DROP POLICY IF EXISTS comments_update ON public.comments;
DROP POLICY IF EXISTS comments_delete ON public.comments;
DROP POLICY IF EXISTS admins_select ON public.admins;
DROP POLICY IF EXISTS admins_insert ON public.admins;
DROP POLICY IF EXISTS admins_update ON public.admins;
DROP POLICY IF EXISTS admins_delete ON public.admins;

CREATE POLICY stages_select ON public.stages
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY stages_insert ON public.stages
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY stages_update ON public.stages
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY stages_delete ON public.stages
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY substeps_select ON public.substeps
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY substeps_insert ON public.substeps
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY substeps_update ON public.substeps
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY substeps_delete ON public.substeps
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agents_select ON public.agents
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY agents_insert ON public.agents
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agents_update ON public.agents
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agents_delete ON public.agents
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agent_stages_select ON public.agent_stages
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY agent_stages_insert ON public.agent_stages
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agent_stages_update ON public.agent_stages
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agent_stages_delete ON public.agent_stages
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agent_substeps_select ON public.agent_substeps
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY agent_substeps_insert ON public.agent_substeps
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agent_substeps_update ON public.agent_substeps
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agent_substeps_delete ON public.agent_substeps
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY comments_select ON public.comments
  FOR SELECT TO authenticated USING (public.is_dlr_user());
CREATE POLICY comments_insert ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND lower(author_email) = lower(auth.jwt() ->> 'email')
  );
CREATE POLICY comments_update ON public.comments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY comments_delete ON public.comments
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY admins_select ON public.admins
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY admins_insert ON public.admins
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND lower(email) ~ '@digitalrealty[.]com$'
  );
CREATE POLICY admins_update ON public.admins
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    AND lower(email) ~ '@digitalrealty[.]com$'
  );
CREATE POLICY admins_delete ON public.admins
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments, public.admins
  FROM anon;

GRANT SELECT ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_agent(
  text, text, text, text, public.agent_priority, date, text
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_agent(
  text, text, text, text, public.agent_priority, date, text
) TO authenticated;

-- If the owner/department feature migrations are present, secure those
-- catalogs and assignments under the same rules.
DO $$
DECLARE
  v_table text;
  v_policy text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'owners', 'departments', 'agent_owners', 'agent_stage_owners'
  ]
  LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      CONTINUE;
    END IF;

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_policy, v_table);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_dlr_user())',
      v_table || '_select',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin())',
      v_table || '_insert',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      v_table || '_update',
      v_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin())',
      v_table || '_delete',
      v_table
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v_table);
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
      v_table
    );
  END LOOP;

  IF to_regprocedure('public.create_agent_with_owners(text,text,text,text,public.agent_priority,date,uuid[])') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_agent_with_owners(text, text, text, text, public.agent_priority, date, uuid[]) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_agent_with_owners(text, text, text, text, public.agent_priority, date, uuid[]) TO authenticated';
  END IF;

  IF to_regprocedure('public.set_agent_owners(uuid,uuid[])') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.set_agent_owners(uuid, uuid[]) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_agent_owners(uuid, uuid[]) TO authenticated';
  END IF;

  IF to_regprocedure('public.set_agent_stage_owners(uuid,uuid[])') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.set_agent_stage_owners(uuid, uuid[]) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_agent_stage_owners(uuid, uuid[]) TO authenticated';
  END IF;

  IF to_regprocedure('public.create_owner(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_owner(text) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_owner(text) TO authenticated';
  END IF;

  IF to_regprocedure('public.rename_owner(uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rename_owner(uuid, text) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.rename_owner(uuid, text) TO authenticated';
  END IF;

  IF to_regprocedure('public.set_owner_active(uuid,boolean)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.set_owner_active(uuid, boolean) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_owner_active(uuid, boolean) TO authenticated';
  END IF;

  IF to_regprocedure('public.create_agent_with_source(text,text,text,text,public.agent_priority,date,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_agent_with_source(text, text, text, text, public.agent_priority, date, text, text) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_agent_with_source(text, text, text, text, public.agent_priority, date, text, text) TO authenticated';
  END IF;

  IF to_regprocedure('public.complete_stage_and_advance(uuid,uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.complete_stage_and_advance(uuid, uuid) FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_stage_and_advance(uuid, uuid) TO authenticated';
  END IF;
END;
$$;
