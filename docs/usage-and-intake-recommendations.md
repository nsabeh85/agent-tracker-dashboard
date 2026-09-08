# Usage data and intake automation

Written recommendations for Nabih and the Copilot Studio tracker team. Research is Microsoft Learn plus the current tracker (Jira PCT backlog and the source-link PR). This is **not** a live Digital Realty tenant audit.

This is a spike, not a build. No app or database changes are in this PR.

| Need | Source |
| --- | --- |
| Who used an agent, and when | Dataverse `ConversationTranscript` |
| What it cost in credits | Power Platform admin center (PPAC) |
| Approved intake details | Jira project PCT |

## Do not start with Teams admin

Teams admin is for publishing and pinning the agent in Teams. It is not the warehouse for who used which agent, when, or what it cost. User counts and dates come from Dataverse conversation transcripts. Dollars come from PPAC Copilot Credits reports.

---

## 1. Usage data capture (Teams)

Goal: know who is using Copilot Studio agents in Teams — user counts, dates, and billing — and whether Dataverse is the raw source.

### Recommendation

Treat Dataverse as the raw operational source for usage, not Teams admin. Publish agents into a full Power Platform environment that has transcript saving turned on. Parse `ConversationTranscript` for Teams sessions. Pull billing separately from PPAC. Ask IT only for environment access, the Bot Transcript Viewer role, and a retention/PII decision — not for a Teams usage extract.

| Question | Source | Teams admin needed? |
| --- | --- | --- |
| User counts (distinct people) | Dataverse `ConversationTranscript` Content JSON, hashed `from.id`, filter `channelId = msteams` | No |
| Dates (session start / created) | `ConversationStartTime` and Created on | No |
| Channel (Teams vs web vs test) | `Content.channelId` (`msteams`, `directline`, …) | No |
| Readable names / emails | Usually not in the transcript. IDs are hashed. Join Entra only if Legal/IT allow it. | No — Entra / identity, not Teams admin |
| Billing (credits / dollars) | PPAC Copilot Credits. Not stored on `ConversationTranscript`. | No — Power Platform / Azure billing admin |
| App in the Teams catalog / pinned | Teams admin center app policies | Yes, for distribution only |

Sources: Microsoft Learn — [conversation transcripts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-powerapps), [transcript controls](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-transcript-controls), [Copilot Credits](https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-messages-capacity). Default Dataverse retention is 30 days.

### Use this: Dataverse ConversationTranscript

Every conversation in a standard environment is written here after inactivity (about 30 minutes). Metadata includes BotId / agent name. Content JSON has activities, timestamps, and a hashed user id.

Access needs the **Bot Transcript Viewer** role. Environment Maker is not enough. Power Platform admin can also turn transcript saving off — confirm it is on before counting users.

### Will fail: Dataverse for Teams / M365 Copilot agents

Microsoft does not write `ConversationTranscript` for Dataverse for Teams environments or for Microsoft 365 Copilot agents.

If any live agent sits in a Teams-only environment, usage will not appear in Dataverse. First check: which environment each production agent actually lives in.

### What we can honestly report

| Metric | How | Caveat |
| --- | --- | --- |
| Sessions | Count transcript rows (merge same `Name` + `ConversationStartTime`) | Split if Content > 1 MB |
| Active users | Distinct hashed `from.id` where role = user | Count of people, not names, unless IT approves an identity join |
| First / last used | Min / max `ConversationStartTime` per BotId | Gone after 30 days unless retention is extended or data is exported |
| Teams-only usage | Filter `channelId = msteams` | Test-pane traffic must be excluded (`ConversationInfo.isDesignMode`) |
| Cost | PPAC billed vs non-billed Copilot Credits per agent / environment | Credits are environment/agent grain; user-level cost is a separate CSV if IT can export it |

### Who to involve

| Role | Needed for | Not needed for |
| --- | --- | --- |
| Power Platform / Copilot Studio admin (likely Nabih or IT PP) | Transcript save setting, Bot Transcript Viewer, environment type, credit reports | Pinning the Teams app |
| IT / security / legal | PII in chat text, 30-day vs longer retention, whether hashed IDs may be joined to Entra | Day-to-day dashboard queries once access exists |
| Teams admin | Publishing the agent to Teams, app permission policies, pinning | User counts, dates, or billing extracts |
| Azure / FinOps | Pay-as-you-go billing policy if credits hit an Azure subscription | Conversation-level usage |

### Suggested path

1. **Week 1:** Confirm environment type and that transcript saving is on. Have one person with Bot Transcript Viewer export 7 days of `ConversationTranscript` for one live Teams agent and prove hashed user counts + `msteams` filter.
2. **Week 2:** Extend the bulk-delete job or Synapse Link if you need more than 30 days.
3. **Week 3:** Monthly PPAC credit CSV stored next to the tracker. Do not wait to build a usage page in the app until that proof exists.

---

## 2. Intake form automation

Goal: pull approved intake details into the tracker automatically, including a short LLM description. Manual linking is acceptable first.

### Recommendation

Keep Jira project PCT (`digitalrealty-cdo.atlassian.net`) as the system of record. Do not scrape Microsoft Forms if the approved record already lives as a PCT ticket. Ship in three steps: link by URL, then create the tracker row on Jira approval, then add an LLM summary. Deduplicate on the Jira key so a second webhook cannot clone the agent.

| Phase | What ships | IT needed? |
| --- | --- | --- |
| 0 — Manual link (now) | Paste the PCT browse URL on the agent (`source_url` in PR #6). Operator still creates the tracker row. | No |
| 1 — Create on approval | Jira Automation: when status becomes Approved, POST key, title, requester, department, description, browse URL to a tracker endpoint that calls `create_agent`. | Yes — Jira admin for the rule, plus a secret for the webhook |
| 2 — LLM short description | Same webhook: send Jira description/custom fields to Azure OpenAI (or approved DLR LLM). Store 1–2 sentences on `agents.description`. Human can edit. | Yes — approved model endpoint, no keys in the frontend |

The tracker already seeds from PCT tickets and stores a Jira browse URL pattern. PR #6 is the manual link; this spike is the automation on top.

### Map into the tracker

| Jira | Agent field |
| --- | --- |
| Summary | `title` |
| Reporter / requestor | `requester_name` |
| Department custom field or component | `requester_department` |
| Description + custom Q&A | LLM → `description` |
| Browse URL | `source_url` |
| Key (`PCT-123`) | Dedupe key; do not use as UUID |

### Do not automate yet

Owners, savings, Copilot Studio URL, and stage progress stay manual. Approval in Jira should create a `pending_approval` tracker row, not mark the agent live.

If the intake form is Microsoft Forms and Jira is only created after approval, trigger on the Jira ticket anyway — that is the durable ID. Forms responses are a worse primary key.

### Preferred design

Jira Automation “Send web request” on transition to Approved → Azure Function or Supabase Edge Function with a shared secret → lookup existing row by `source_url` or stored Jira key → insert if new → call Azure OpenAI with a fixed prompt (“two sentences, no PII expansion, business outcome only”) → write description.

Fail closed: if the LLM call fails, still create the row with the raw Jira description truncated.

Do not put a Jira API token or OpenAI key in the Vite app. The webhook should be server-side, allowlisted to Atlassian IPs if practical, and write through an existing `create_agent` RPC rather than a wide table grant. Ask Jira admins which status name means “approved” before coding — a wrong transition will flood the dashboard.

---

## Ask Nabih before building

| Open question | Why it blocks |
| --- | --- |
| Are production agents in a full Dataverse environment or Dataverse for Teams? | Transcripts do not exist in Dataverse for Teams. |
| Which Jira status means approved for PCT? | Webhook trigger. |
| Which field is department on the intake ticket? | Tracker department dropdown vs free text. |
| May we store hashed user ids from transcripts? May we join to Entra later? | Legal / DLR privacy. |
| Who can assign Bot Transcript Viewer and export PPAC credit CSVs? | Identifies whether IT is a blocker or Nabih can self-serve. |
