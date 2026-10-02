# Jira intake (AIBU-79)

Jira status is not an approval gate. Nabih's direction (October 2, 2026) is to bring every
**PCT / AI Request** onto the tracker, then review it by hand. Unapproved rows are moved to
**Backlog** on the agent page. The dashboard hides Backlog unless that filter is selected.
Tony and Aaron are working on how Jira delivers the tickets; this tracker side accepts
whatever status those tickets are in.

When a **PCT / AI Request** is sent to the tracker, it creates one `pending_approval` row if it has not already seen that issue. Later webhooks for the same `PCT-n` **refresh Jira-owned fields** (title, requestor, department, description, priority). Tracker-owned fields never change from Jira: owners, go-live, dashboard status, stages, savings, Copilot Studio URL. Moving a row to Backlog stays put, because Jira does not write status. There is no LLM step and no write-back to Jira.

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

Jira status is ignored. Rejected entirely: any project other than **PCT**, any issue type other than **AI Request**. After review, set the tracker status to **Backlog** to take an unapproved request off the board.

## Deploy (server-side only)

1. Apply `supabase/migrations/20260922000001_import_approved_jira_request.sql`, `supabase/migrations/20260922000002_sync_existing_jira_request.sql`, `supabase/migrations/20261002000001_import_jira_request_any_status.sql`, and `supabase/migrations/20261002000002_agent_backlog_status.sql`. If the September 22 migrations are already applied, only the October 2 files are new.
2. Create a long random secret (16+ characters). Store it only in the Edge Function secret `JIRA_WEBHOOK_SECRET`. Do **not** put it in the Vite app or any `VITE_` variable.
3. Deploy with JWT verification off (Jira cannot send a Supabase user token):

```bash
supabase secrets set JIRA_WEBHOOK_SECRET='…'
supabase functions deploy import-jira-request --no-verify-jwt
```

The function URL looks like `https://<project-ref>.supabase.co/functions/v1/import-jira-request`.

## Jira Automation

Project: **PCT**. Use two rules that share the same web request:

1. **Create:** Issue created, or any transition, issue type **AI Request**. Status does not matter.
2. **Refresh:** Issue updated, issue type **AI Request**. A later edit refreshes a row that already exists and does not change tracker status.
3. Action for both: **Send web request**
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

A later notification for the same `PCT-n` returns `updated: true` and refreshes Jira-owned fields. A first notification creates a row no matter which Jira status it is in.

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
