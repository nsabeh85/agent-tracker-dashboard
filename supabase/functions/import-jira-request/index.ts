import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  mapJiraWebhookPayload,
  secretsMatch,
  webhookSecretFromHeaders,
} from '../_shared/jiraApprovedImport.ts'

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' })
  }

  const expected = Deno.env.get('JIRA_WEBHOOK_SECRET') ?? ''
  if (!secretsMatch(expected, webhookSecretFromHeaders(req.headers))) {
    return json(401, { error: 'unauthorized' })
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const mapped = mapJiraWebhookPayload(payload)
  if (!mapped.ok) {
    return json(422, { error: mapped.reason })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'server_misconfigured' })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { value } = mapped
  const { data, error } = await supabase.rpc('import_approved_jira_request', {
    p_issue_key: value.issueKey,
    p_issue_type: value.issueType,
    p_status: value.status,
    p_project_key: value.projectKey,
    p_title: value.title,
    p_requester_name: value.requesterName,
    p_requester_department: value.requesterDepartment,
    p_description: value.description,
    p_priority: value.priority,
    p_source_url: value.sourceUrl,
  })

  if (error) {
    const reason = error.message.split('\n')[0] ?? 'import_failed'
    const known = [
      'not_approved',
      'wrong_project',
      'wrong_issue_type',
      'invalid_key',
      'invalid_source_url',
      'missing_title',
    ]
    if (known.includes(reason)) {
      return json(422, { error: reason })
    }
    return json(500, { error: 'import_failed' })
  }

  const result = data as {
    agent_id?: string | null
    created?: boolean
    updated?: boolean
    skipped?: boolean
    issue_key?: string
    reason?: string
  }
  return json(200, {
    agent_id: result.agent_id,
    created: result.created ?? false,
    updated: result.updated ?? false,
    skipped: result.skipped ?? false,
    issue_key: result.issue_key ?? value.issueKey,
    reason: result.reason,
  })
})
