# Measuring Copilot Studio Agent Usage, and Automating Intake

**Prepared by:** Lauren Lawhon
**For review by:** Jim, Nabih Sabeh
**Date:** September 8, 2026
**Status:** Recommendation — no changes have been built yet

---

## Executive summary

We were asked two questions: how do we find out who is actually using the Copilot Studio agents we deliver, and how do we stop re-typing approved intake requests into the tracker by hand.

Both are solvable without new tooling purchases. Neither is blocked on engineering. Both are blocked on a small number of access and policy decisions.

**On usage.** The data we need already exists. Microsoft records every agent conversation, including conversations that happen inside Teams, into Dataverse. That gives us how many people used an agent and on what dates. Cost is recorded separately, in the Power Platform admin center, as Copilot Credits. The important correction to a common assumption: **the Teams admin team is not the source of this data.** Teams admin controls how an agent gets published and pinned in Teams. It does not hold usage or cost history.

**On intake.** We should treat the Jira PCT project as the single system of record and automate from there, rather than building anything against the intake form itself. We can deliver this in three small steps, and the first step is already in review.

**What we need from leadership.** Access to one Power Platform environment, one security role granted to one person, and a decision on how long we may retain conversation data and whether we may identify individual users. Those five questions are listed at the end.

---

## Part 1 — Knowing who uses our agents

### The recommendation

Use Dataverse as the source of record for usage, and the Power Platform admin center for cost. Do not route this request through the Teams admin team.

Concretely, we should confirm our production agents live in a full Power Platform environment, confirm conversation recording is switched on, grant one person the role needed to read that data, and produce a first usage report from a single live agent before we build anything into the tracker dashboard.

### What each question maps to

| What leadership wants to know | Where it comes from |
| --- | --- |
| How many people used this agent | Dataverse conversation records |
| When they used it, and whether usage is growing | Dataverse conversation records |
| Whether usage came from Teams specifically | Dataverse conversation records |
| What the agent cost us | Power Platform admin center (Copilot Credits) |
| Who specifically used it, by name | Not directly available — see limitation below |

### Two limitations worth knowing now

**We can count people, but not name them.** Microsoft deliberately obscures user identity in these records. We can report "14 distinct people used the Legal agent in August" with confidence. Reporting *which* 14 people would require deliberately joining this data to our employee directory, which is a privacy decision, not a technical one.

**The data expires after 30 days by default.** Anything older is deleted automatically. If we want quarter-over-quarter or year-over-year adoption trends, someone has to extend that retention window or export the data on a schedule. This is worth deciding before we need the history, not after.

There is also one scenario that would break this approach entirely: if any of our production agents were built in a Teams-only environment, Microsoft does not record their conversations at all. Confirming which environment each live agent sits in is the very first thing to check.

### Who we need, and for what

| Who | What we need from them |
| --- | --- |
| Power Platform / Copilot Studio admin | Confirm the environment type, confirm recording is on, grant read access, share the monthly cost report |
| IT, security, and legal | Decide how long we may keep conversation data, and whether we may identify individual users |
| Teams admin | Nothing for reporting — only for publishing and pinning agents in Teams |
| Azure / finance | Only if agent costs are billed to an Azure subscription |

### Suggested sequence

1. **Confirm the foundation.** Verify the environment type and that conversation recording is enabled.
2. **Prove it with one agent.** Have one person pull a week of data for a single live Teams agent and produce a real user count and date range. This validates the whole approach cheaply.
3. **Decide on retention.** Extend the 30-day window, or set up a scheduled export, depending on how much history leadership wants.
4. **Add cost.** Pull the monthly credit report and store it alongside the tracker.
5. **Only then build.** Adding a usage page to the tracker dashboard should come after we have proven the data is real and readable.

---

## Part 2 — Automating intake into the tracker

### The recommendation

Keep the Jira PCT project as the system of record, and automate from Jira rather than from the intake form. When a request is approved in Jira, it should create the tracker record automatically, including a short plain-language description generated for us rather than written by hand.

We should ship this in three steps rather than all at once.

### The three steps

**Step 1 — Link by hand (already in review).** Each tracker record gets a link back to its originating Jira request. The team still creates the tracker record manually, but the two systems are connected and we stop losing the trail. This is already submitted for review.

**Step 2 — Create the record automatically.** When a request is approved in Jira, Jira notifies the tracker, and the tracker creates the request record with the title, requester, department, and link already filled in. The record arrives as pending approval, not as a live agent, so nothing bypasses our existing process.

**Step 3 — Add a readable description.** Intake tickets are long and inconsistent. In this step the same automation asks an approved AI service to condense the request into one or two plain sentences describing the business outcome. A human can always edit it.

### What stays manual on purpose

Ownership, dollar savings, the link to the live agent, and stage progress all stay manual. These are judgment calls the team makes, not fields that should be inferred from an intake ticket.

### Guardrails

Approval in Jira creates a tracker record; it does not mark an agent as delivered. The automation must recognize a request it has already seen, so a duplicate notification cannot create a second copy of the same agent. Credentials for this automation stay server-side and never ship in the tracker website. And before we build, Jira administrators need to tell us exactly which approval status should trigger it — triggering on the wrong status would flood the dashboard.

---

## Decisions we need

| Question | Why it matters | Who can answer |
| --- | --- | --- |
| Which environment do our production agents live in? | If it is a Teams-only environment, usage is not recorded at all and this approach has to change. | Nabih / Power Platform admin |
| How long may we retain conversation data? | Default is 30 days. Longer history requires a deliberate change. | IT, security, legal |
| May we identify individual users, or only count them? | Determines whether we report "14 people" or a named list. | IT, security, legal |
| Who can grant read access to the usage data and pull the cost report? | Tells us whether this is self-service for Nabih or needs an IT request. | Nabih / IT |
| Which Jira status means "approved"? | This is the trigger for intake automation. | Jira administrators |

---

## Scope of this document

This is a written recommendation based on Microsoft's published documentation and the current state of our tracker. It is not an audit of our live tenant — no usage data has been pulled yet, because that access is one of the things being requested here. No application or database changes are included.

**Reference documentation:** Microsoft Learn on [conversation transcripts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-powerapps), [transcript access controls](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-transcript-controls), and [Copilot Credits and capacity](https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-messages-capacity).

---

## Appendix — Technical detail

Included for Nabih and whoever implements this. Leadership does not need this section.

### Usage data

Copilot Studio writes every conversation in a standard environment to the Dataverse `ConversationTranscript` table, roughly 30 minutes after the conversation goes idle. Useful fields:

| Field | Use |
| --- | --- |
| `ConversationStartTime`, `Created on` | Session dates |
| `Metadata` (`BotId`, `BotName`) | Which agent |
| `Content` → `from.id` where `role` = user | Distinct user count; the value is hashed |
| `Content` → `channelId` | Channel filter; Teams is `msteams` |
| `Content` → `ConversationInfo.isDesignMode` | Excludes test-pane traffic from real usage |

Notes and constraints:

- Reading this table requires the **Bot Transcript Viewer** security role. The Environment Maker role is not sufficient.
- A Power Platform admin can disable transcript saving per environment. Confirm it is enabled before trusting any counts.
- Transcripts are **not** written for Dataverse for Teams environments, Microsoft 365 Copilot agents, or developer environments.
- Records over 1 MB are split. Merge rows sharing the same `Name` and `ConversationStartTime`, ordered by `BatchId`.
- A recurring bulk-delete job removes records older than 30 days. To keep more, cancel that job and create a replacement with a longer window, or export to Azure Data Lake Storage via Azure Synapse Link.
- Responses drawn from SharePoint sources with sensitivity labels are redacted in transcript content.

### Cost data

Copilot Credits consumption is reported in the Power Platform admin center at tenant, environment, and agent grain, with billed and non-billed credits separated. It is not stored in `ConversationTranscript`. Per-agent and per-user CSV exports are available from the licensing pages; user-level cost attribution is a separate export and is not guaranteed to be available to us.

### Intake automation

Proposed flow: a Jira Automation rule fires on transition to the approved status and sends a web request to a server-side endpoint (Azure Function or Supabase Edge Function) authenticated with a shared secret. The endpoint looks for an existing tracker row by Jira key or source URL, inserts through the existing `create_agent` routine if the request is new, then calls an approved model endpoint for a two-sentence summary and writes it to the description.

Field mapping:

| Jira | Tracker field |
| --- | --- |
| Summary | `title` |
| Reporter / requestor | `requester_name` |
| Department field or component | `requester_department` |
| Description and intake answers | `description`, via summarization |
| Browse URL | `source_url` |
| Issue key (`PCT-123`) | Deduplication key only — not the record ID |

Implementation constraints:

- Fail closed on summarization: if the model call fails, still create the record using a truncated version of the raw Jira description.
- No Jira token or model API key in the frontend bundle. The endpoint writes through the existing creation routine rather than receiving a broad table grant.
- New records must arrive with `pending_approval` status.
