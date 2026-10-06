-- The agent page URL is what people paste from the address bar. Anonymous
-- visitors may read that one request. They still cannot query tracker tables.

CREATE OR REPLACE FUNCTION public.get_public_agent_by_id(p_agent_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_public_agent(agent.public_token)
  FROM public.agents AS agent
  WHERE agent.id = p_agent_id;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent_by_id(uuid) TO anon, authenticated;
