-- Enable Realtime so open dashboards pick up milestone and comment changes.

ALTER TABLE public.agents REPLICA IDENTITY FULL;
ALTER TABLE public.agent_stages REPLICA IDENTITY FULL;
ALTER TABLE public.agent_substeps REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.agents,
  public.agent_stages,
  public.agent_substeps,
  public.comments;
