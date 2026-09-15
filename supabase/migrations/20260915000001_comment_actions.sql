-- Threaded replies plus author-only edit/delete permissions.

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid NULL
  REFERENCES public.comments (id) ON DELETE SET NULL;

ALTER TABLE public.comments
  DROP CONSTRAINT IF EXISTS comments_parent_not_self;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_parent_not_self
  CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);

CREATE INDEX IF NOT EXISTS comments_parent_comment_id_idx
  ON public.comments (parent_comment_id);

CREATE OR REPLACE FUNCTION public.validate_comment_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.agent_id IS DISTINCT FROM OLD.agent_id
    OR NEW.author_email IS DISTINCT FROM OLD.author_email
    OR NEW.author_name IS DISTINCT FROM OLD.author_name
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Comment ownership and agent cannot be changed';
  END IF;

  IF NEW.parent_comment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.comments AS parent
    WHERE parent.id = NEW.parent_comment_id
      AND parent.agent_id = NEW.agent_id
  ) THEN
    RAISE EXCEPTION 'A reply must belong to the same agent as its parent comment';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_validate_parent ON public.comments;
CREATE TRIGGER comments_validate_parent
  BEFORE INSERT OR UPDATE OF parent_comment_id, agent_id ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_parent();

DROP POLICY IF EXISTS comments_update ON public.comments;
CREATE POLICY comments_update ON public.comments
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    AND lower(author_email) = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    public.is_admin()
    AND lower(author_email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS comments_delete ON public.comments;
CREATE POLICY comments_delete ON public.comments
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    AND lower(author_email) = lower(auth.jwt() ->> 'email')
  );

CREATE OR REPLACE FUNCTION public.get_public_agent(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_payload jsonb;
BEGIN
  v_token := lower(btrim(COALESCE(p_token, '')));
  IF v_token !~ '^[0-9a-f]{32}$' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'title', agent.title,
    'description', agent.description,
    'source_url', agent.source_url,
    'requester_name', agent.requester_name,
    'requester_department', agent.requester_department,
    'priority', agent.priority,
    'status', agent.status,
    'owners', agent.assigned_to,
    'current_stage_id', agent.current_stage_id,
    'target_go_live', agent.target_go_live,
    'created_at', agent.created_at,
    'stages', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', agent_stage.id,
            'stage_id', stage.id,
            'name', stage.name,
            'sort_order', stage.sort_order,
            'status', agent_stage.status,
            'expected_duration_days', agent_stage.expected_duration_days,
            'actual_start', agent_stage.actual_start,
            'actual_end', agent_stage.actual_end
          )
          ORDER BY stage.sort_order
        ),
        '[]'::jsonb
      )
      FROM public.agent_stages AS agent_stage
      JOIN public.stages AS stage ON stage.id = agent_stage.stage_id
      WHERE agent_stage.agent_id = agent.id
    ),
    'substeps', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', agent_substep.id,
            'agent_stage_id', agent_substep.agent_stage_id,
            'name', agent_substep.name,
            'sort_order', agent_substep.sort_order,
            'status', agent_substep.status
          )
          ORDER BY agent_substep.sort_order, agent_substep.name
        ),
        '[]'::jsonb
      )
      FROM public.agent_substeps AS agent_substep
      WHERE agent_substep.agent_id = agent.id
    ),
    'comments', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', comment.id,
            'author_name', comment.author_name,
            'body', comment.body,
            'created_at', comment.created_at,
            'agent_stage_id', comment.agent_stage_id,
            'parent_comment_id', comment.parent_comment_id
          )
          ORDER BY comment.created_at
        ),
        '[]'::jsonb
      )
      FROM public.comments AS comment
      WHERE comment.agent_id = agent.id
    )
  )
  INTO v_payload
  FROM public.agents AS agent
  WHERE agent.public_token = v_token;

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_agent(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agent(text) TO anon, authenticated;
