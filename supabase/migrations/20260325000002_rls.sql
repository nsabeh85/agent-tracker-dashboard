-- Row Level Security: public read on tracker data; writes only for allowlisted admins.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE email = (auth.jwt() ->> 'email')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.substeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_substeps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- SELECT: anon + authenticated on all tables except admins
CREATE POLICY stages_select ON public.stages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY substeps_select ON public.substeps
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY agents_select ON public.agents
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY agent_stages_select ON public.agent_stages
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY agent_substeps_select ON public.agent_substeps
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY comments_select ON public.comments
  FOR SELECT TO anon, authenticated USING (true);

-- admins: authenticated read only, no public read
CREATE POLICY admins_select ON public.admins
  FOR SELECT TO authenticated USING (true);

-- Writes: authenticated admin allowlist only
CREATE POLICY stages_insert ON public.stages
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY stages_update ON public.stages
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY stages_delete ON public.stages
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY substeps_insert ON public.substeps
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY substeps_update ON public.substeps
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY substeps_delete ON public.substeps
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agents_insert ON public.agents
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agents_update ON public.agents
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agents_delete ON public.agents
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agent_stages_insert ON public.agent_stages
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agent_stages_update ON public.agent_stages
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agent_stages_delete ON public.agent_stages
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY agent_substeps_insert ON public.agent_substeps
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY agent_substeps_update ON public.agent_substeps
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY agent_substeps_delete ON public.agent_substeps
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY comments_insert ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
    AND author_email = (auth.jwt() ->> 'email')
  );
CREATE POLICY comments_update ON public.comments
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY comments_delete ON public.comments
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY admins_insert ON public.admins
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY admins_update ON public.admins
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY admins_delete ON public.admins
  FOR DELETE TO authenticated USING (public.is_admin());

GRANT SELECT ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments
  TO anon, authenticated;

GRANT SELECT ON public.admins TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments, public.admins
  TO authenticated;
