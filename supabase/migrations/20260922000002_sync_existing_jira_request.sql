-- Refresh Jira-owned fields on an existing tracker row. Create still requires
-- status Approved. Tracker-owned fields (owners, go-live, stage, status,
-- savings, studio URL) are never overwritten.

CREATE OR REPLACE FUNCTION public.import_approved_jira_request(
  p_issue_key text,
  p_issue_type text,
  p_status text,
  p_project_key text,
  p_title text,
  p_requester_name text,
  p_requester_department text,
  p_description text,
  p_priority public.agent_priority,
  p_source_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text := upper(btrim(p_issue_key));
  v_source text := btrim(p_source_url);
  v_title text := left(btrim(p_title), 500);
  v_requester text := left(btrim(p_requester_name), 200);
  v_department text := left(btrim(p_requester_department), 200);
  v_description text := left(btrim(p_description), 4000);
  v_catalog_department text;
  v_existing uuid;
  v_agent_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('jira-import:' || v_key));

  IF v_key !~ '^PCT-[0-9]+$' THEN
    RAISE EXCEPTION 'invalid_key' USING ERRCODE = '22023';
  END IF;

  IF upper(btrim(p_project_key)) <> 'PCT' THEN
    RAISE EXCEPTION 'wrong_project' USING ERRCODE = '22023';
  END IF;

  IF lower(btrim(p_issue_type)) <> 'ai request' THEN
    RAISE EXCEPTION 'wrong_issue_type' USING ERRCODE = '22023';
  END IF;

  IF v_title = '' THEN
    RAISE EXCEPTION 'missing_title' USING ERRCODE = '22023';
  END IF;

  IF v_source IS DISTINCT FROM ('https://digitalrealty-cdo.atlassian.net/browse/' || v_key) THEN
    RAISE EXCEPTION 'invalid_source_url' USING ERRCODE = '22023';
  END IF;

  IF v_requester = '' THEN
    v_requester := 'Not specified';
  END IF;

  SELECT d.name
  INTO v_catalog_department
  FROM public.departments AS d
  WHERE lower(d.name) = lower(v_department)
    AND d.active
  LIMIT 1;

  IF v_catalog_department IS NOT NULL THEN
    v_department := v_catalog_department;
  ELSIF v_department = '' THEN
    v_department := 'Unknown';
  END IF;

  IF v_description = '' THEN
    v_description := v_title;
  END IF;

  SELECT a.id
  INTO v_existing
  FROM public.agents AS a
  WHERE a.source_url = v_source
     OR upper(substring(coalesce(a.source_url, '') FROM 'PCT-[0-9]+$')) = v_key
     OR a.description ILIKE v_key || '.%'
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.agents
    SET title = v_title,
        requester_name = v_requester,
        requester_department = v_department,
        description = v_description,
        priority = p_priority,
        source_url = v_source
    WHERE id = v_existing;

    RETURN jsonb_build_object(
      'agent_id', v_existing,
      'created', false,
      'updated', true,
      'skipped', false,
      'issue_key', v_key
    );
  END IF;

  IF lower(btrim(p_status)) <> 'approved' THEN
    RETURN jsonb_build_object(
      'agent_id', NULL,
      'created', false,
      'updated', false,
      'skipped', true,
      'issue_key', v_key,
      'reason', 'not_approved'
    );
  END IF;

  v_agent_id := public.create_agent(
    v_title,
    v_requester,
    v_department,
    v_description,
    p_priority,
    NULL,
    'Unassigned'
  );

  UPDATE public.agents
  SET source_url = v_source
  WHERE id = v_agent_id;

  RETURN jsonb_build_object(
    'agent_id', v_agent_id,
    'created', true,
    'updated', false,
    'skipped', false,
    'issue_key', v_key
  );
END;
$$;
