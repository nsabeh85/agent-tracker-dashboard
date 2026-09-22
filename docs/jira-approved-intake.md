# Approved Jira intake (AIBU-79)

> **Blocked on a Jira decision.** As of September 22, 2026 the PCT workflow has no
> **Approved** status. Available statuses are New, Backlog, Refining, Signoff Requested,
> In Progress, STEP Requested, SteerCo Requested, UAT, Self Serve, On Hold, Blocked,
> Rejected, and Resolved. Jira admins must either add an **Approved** status or name the
> existing status that means approved. Until then the Automation rule below cannot be
> created. Changing the trigger means editing the status check in
> `src/lib/jiraApprovedImport.ts`, the `not_approved` guard in
> `supabase/migrations/20260922000001_import_approved_jira_request.sql`, and this doc.

When a **PCT / AI Request** ticket moves to status **Approved**, Jira should notify the tracker. The tracker creates one `pending_approval` row if it has not already seen that issue. There is no LLM step: the description is the truncated intake text.

Ownership, target go-live, savings, and Copilot Studio URL stay empty or `Unassigned` until someone edits the record in the dashboard.

## What gets created

| Jira | Tracker |
| --- | --- |
| Summary | `title` |
| Description heading **Requestor** (else reporter name) | `requester_name` |
| Description heading **Business unit** | `requester_department` (matched to the department catalog when the name already exists) |
| Description heading **Urgency**, else Jira priority | `priority` |
| Truncated raw description (max 4000 characters) | `description` |
| `https://digitalrealty-cdo.atlassian.net/browse/PCT-n` | `source_url` |
| — | `assigned_to` = `Unassigned`, `target_go_live` = null, `status` = `pending_approval` |

Rejected: any status other than **Approved**, any project other than **PCT**, any issue type other than **AI Request**, duplicate `source_url` / `PCT-n`.

## Deploy (server-side only)

1. Apply `supabase/migrations/20260922000001_import_approved_jira_request.sql`.
2. Create a long random secret (16+ characters). Store it only in the Edge Function secret `JIRA_WEBHOOK_SECRET`. Do **not** put it in the Vite app or any `VITE_` variable.
3. Deploy with JWT verification off (Jira cannot send a Supabase user token):

```bash
supabase secrets set JIRA_WEBHOOK_SECRET='…'
supabase functions deploy import-jira-request --no-verify-jwt
```

The function URL looks like `https://<project-ref>.supabase.co/functions/v1/import-jira-request`.

## Jira Automation

Project: **PCT**. Rule:

1. Trigger: **Issue transitioned** to **Approved**.
2. Condition: issue type is **AI Request**.
3. Action: **Send web request**
   - URL: the Edge Function URL above
   - Method: POST
   - Headers: `Content-Type: application/json` and `X-Jira-Webhook-Secret: <same secret>`
   - Body: custom JSON that includes the issue (Jira’s default “Send issue data” payload is fine if it contains `issue.key` and `issue.fields`)

Example custom body:

```json
{
  "issue": {
    "key": "{{issue.key}}",
    "fields": {
      "summary": "{{issue.summary}}",
      "description": {{issue.description}},
      "status": { "name": "{{issue.status.name}}" },
      "issuetype": { "name": "{{issue.issueType.name}}" },
      "project": { "key": "{{issue.project.key}}" },
      "priority": { "name": "{{issue.priority.name}}" },
      "reporter": { "displayName": "{{issue.reporter.displayName}}" }
    }
  }
}
```

If `{{issue.description}}` cannot be emitted as JSON, send Jira’s standard webhook body instead; the function reads `issue.fields.description` as plain text or Atlassian document format.

## Local checks

```bash
npm test
npm run lint
```

A duplicate notification for the same `PCT-n` returns `created: false` and the existing `agent_id`.

## Rollback

Drop the function and unique indexes if the rule must be disabled:

```sql
DROP FUNCTION IF EXISTS public.import_approved_jira_request(
  text, text, text, text, text, text, text, text, public.agent_priority, text
);
DROP INDEX IF EXISTS public.agents_source_url_unique;
DROP INDEX IF EXISTS public.agents_jira_browse_key_unique;
```

Then undeploy the Edge Function and disable the Jira rule. Existing tracker rows are left in place.
