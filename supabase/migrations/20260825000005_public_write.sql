-- Open tracker writes to the anon key. There is no admin allowlist anymore.
-- Anyone who can reach the app can create, update, and delete tracker rows.

DROP POLICY IF EXISTS stages_insert ON public.stages;
DROP POLICY IF EXISTS stages_update ON public.stages;
DROP POLICY IF EXISTS stages_delete ON public.stages;
DROP POLICY IF EXISTS substeps_insert ON public.substeps;
DROP POLICY IF EXISTS substeps_update ON public.substeps;
DROP POLICY IF EXISTS substeps_delete ON public.substeps;
DROP POLICY IF EXISTS agents_insert ON public.agents;
DROP POLICY IF EXISTS agents_update ON public.agents;
DROP POLICY IF EXISTS agents_delete ON public.agents;
DROP POLICY IF EXISTS agent_stages_insert ON public.agent_stages;
DROP POLICY IF EXISTS agent_stages_update ON public.agent_stages;
DROP POLICY IF EXISTS agent_stages_delete ON public.agent_stages;
DROP POLICY IF EXISTS agent_substeps_insert ON public.agent_substeps;
DROP POLICY IF EXISTS agent_substeps_update ON public.agent_substeps;
DROP POLICY IF EXISTS agent_substeps_delete ON public.agent_substeps;
DROP POLICY IF EXISTS comments_insert ON public.comments;
DROP POLICY IF EXISTS comments_update ON public.comments;
DROP POLICY IF EXISTS comments_delete ON public.comments;
DROP POLICY IF EXISTS admins_select ON public.admins;
DROP POLICY IF EXISTS admins_insert ON public.admins;
DROP POLICY IF EXISTS admins_update ON public.admins;
DROP POLICY IF EXISTS admins_delete ON public.admins;

CREATE POLICY stages_insert ON public.stages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY stages_update ON public.stages
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY stages_delete ON public.stages
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY substeps_insert ON public.substeps
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY substeps_update ON public.substeps
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY substeps_delete ON public.substeps
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY agents_insert ON public.agents
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY agents_update ON public.agents
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY agents_delete ON public.agents
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY agent_stages_insert ON public.agent_stages
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY agent_stages_update ON public.agent_stages
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY agent_stages_delete ON public.agent_stages
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY agent_substeps_insert ON public.agent_substeps
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY agent_substeps_update ON public.agent_substeps
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY agent_substeps_delete ON public.agent_substeps
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY comments_insert ON public.comments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY comments_update ON public.comments
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY comments_delete ON public.comments
  FOR DELETE TO anon, authenticated USING (true);

GRANT INSERT, UPDATE, DELETE ON public.stages, public.substeps, public.agents,
  public.agent_stages, public.agent_substeps, public.comments
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_agent(
  text, text, text, text, public.agent_priority, date, text
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.is_admin();
