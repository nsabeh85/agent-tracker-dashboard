-- Owner-management RPCs must obey the caller's RLS permissions. They were
-- originally SECURITY DEFINER so they bypassed RLS even after RBAC was added,
-- allowing any authenticated user to call them directly.

ALTER FUNCTION public.set_agent_owners(uuid, uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.set_agent_stage_owners(uuid, uuid[]) SECURITY INVOKER;
ALTER FUNCTION public.create_agent_with_owners(
  text, text, text, text, public.agent_priority, date, uuid[]
) SECURITY INVOKER;
ALTER FUNCTION public.create_owner(text) SECURITY INVOKER;
ALTER FUNCTION public.rename_owner(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.set_owner_active(uuid, boolean) SECURITY INVOKER;
