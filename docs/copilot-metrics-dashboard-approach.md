# Copilot Studio metrics and dashboard approach

**Jira:** [AIBU-113](https://digitalrealty-cdo.atlassian.net/browse/AIBU-113), [AIBU-114](https://digitalrealty-cdo.atlassian.net/browse/AIBU-114), [AIBU-118](https://digitalrealty-cdo.atlassian.net/browse/AIBU-118), [AIBU-120](https://digitalrealty-cdo.atlassian.net/browse/AIBU-120)  
**Related:** [AIBU-77](https://digitalrealty-cdo.atlassian.net/browse/AIBU-77) (written rec, Done), [AIBU-80](https://digitalrealty-cdo.atlassian.net/browse/AIBU-80) (UI, hold)  
**Prepared:** September 24, 2026  
**Status:** Formal recommendation for review — not a live tenant pull, not a built dashboard

## Executive summary

This report completes the research/proposal/documentation work described by AIBU-113,
AIBU-118, and AIBU-120. It gives AIBU-114 a cost-alignment proposal, but it does **not**
complete alignment: no Digital Realty Copilot Credit export, Azure invoice, finance rate,
budget owner, or approved tokenomics model was provided or accessed.

The recommended observability path is:

1. Prove one published Teams agent using Dataverse conversation transcripts.
2. Pull the same agent's Copilot Credit consumption from the Power Platform admin center.
3. Have Nabih, Brian, Finance, Security, and the business owner approve definitions and
   privacy boundaries.
4. Store only agent-scoped aggregates in the tracker; never raw transcripts or credentials.

## Scope, method, and evidence

This report was prepared from:

- the actual Jira text for AIBU-113, 114, 118, and 120;
- the current tracker repository and database model;
- Microsoft's current documentation for Copilot Studio transcripts, retention, access,
  analytics, Copilot Credits, and pay-as-you-go reporting;
- the earlier AIBU-77 discovery contract in PR #30.

No Digital Realty Copilot Studio, Dataverse, Power Platform admin center, Application
Insights workspace, Azure Cost Management scope, or finance system was accessed. Therefore
all tenant-specific values and source availability are explicitly marked as validation or
approval gaps rather than findings.

## Recommendation

Do **not** start with a tile grid in the tracker. Prove two Microsoft sources on **one published Teams agent**, then store small agent-scoped aggregates. Build AIBU-80 only after Nabih, Brian, and the business owners lock the metric list.

| Need | Source of record | Not the source |
| --- | --- | --- |
| Who used it, when, Teams vs other, outcomes, feedback | Dataverse `ConversationTranscript` | Teams admin, Cosmos, the tracker title field |
| What it cost in Copilot Credits | Power Platform admin center (billed vs non-billed) | Dataverse, Application Insights |
| Dollar cost | Finance-approved conversion of credits, or a figure finance supplies | Guessing a list price in the app |
| Dollar savings | Existing tracker savings fields | Telemetry |
| Latency / tool failures | Application Insights, if already connected | Usage or billing |

The browser must never query Dataverse, Power Platform, or Application Insights. A server job (or a person, for the first proof) writes aggregates keyed by `agents.id`. Public `/track/:token` pages must not show usage or cost.

## Proposed dashboard shape (after proof)

AIBU-80 asks for an all-agent tile grid. Later meeting direction was observability **inside each agent**. Until Nabih picks one, the tracker should assume:

1. **On the existing agent detail page:** the approved metrics for that agent (week/month counts, credits, last proof date).
2. **Optional later:** a board of those same tiles if leadership still wants a scan view.

Placeholder zeros or fake charts are out of scope.

## Candidate metrics (not final)

These are the list to approve or cut. None of them are implemented.

| Metric | How we would compute it | Source | Privacy |
| --- | --- | --- | --- |
| Weekly / monthly active users | Distinct hashed `from.id` values only after the one-agent proof confirms Teams supplies a stable user ID; otherwise this metric is unavailable | Dataverse | Pseudonymous |
| Sessions | Reconstructed conversations (merge split transcript rows) | Dataverse | Aggregate |
| Teams share | Sessions where channel is `msteams` | Dataverse | Aggregate |
| Outcome rate | Approved “success” outcomes ÷ eligible completed sessions | Dataverse | Aggregate |
| Credits consumed | Billed and non-billed credits for the mapped agent | Power Platform | Commercially sensitive |
| Estimated cost | Credits × finance rate, **or** a number finance posts | Credits + finance | Commercially sensitive |
| Estimated savings | Existing tracker savings, already in Supabase | Tracker | Business estimate |
| Runtime failure / latency | Only if Application Insights is already on | App Insights | Aggregate |

### Definition contract required before implementation

For every approved metric, record:

- exact numerator, denominator, exclusions, timezone, and calendar/rolling window;
- stable source fields and agent identifier;
- expected freshness, retention, and missing-data behavior;
- privacy classification, minimum sample threshold, and whether named users are prohibited;
- business owner, technical owner, approval date, and review cadence.

Until those fields are approved, the entries above are candidates—not production KPIs.

## Tokenomics and cost alignment (AIBU-114)

Copilot Credits are the usage currency Microsoft bills. They are **not** the same as:

- Azure OpenAI tokens
- tracker “savings”
- a USD amount until finance says how to convert them

Proposed alignment:

1. **Show credits first.** Always split billed vs non-billed if the export allows it.
2. **Do not invent a dollar figure in the app.** Either finance publishes a rate, or they publish a monthly cost we store as a number they own.
3. **Keep savings separate.** It is an intake/business estimate on the tracker row, not derived from credits.
4. **Do not mix Azure token invoices into the same tile** unless finance confirms those invoices are the same spend as Copilot Credits for that agent. For Copilot Studio in a standard environment, the credit report is the default cost source; Azure token lines would be a second, labeled series only after that confirmation.

### What can be reported without assumptions

- Copilot Credits consumed, separated into billed and non-billed credits when available.
- Agent/environment/channel/model/tool dimensions supplied by the official consumption
  report.
- Month-to-date billed credits and configured agent limits.
- Azure-billed amount at the meter/billing-policy level for pay-as-you-go, noting that
  Azure Cost Management does not provide the same agent-level attribution.

### Approval gate for AIBU-114

AIBU-114 is not fully aligned until Nabih and Finance provide:

- the authoritative budget/cost owner;
- prepaid versus pay-as-you-go treatment;
- whether non-billed credits are shown and how they are labeled;
- an approved credit-to-currency method, or confirmation that currency is not shown;
- whether Azure OpenAI or other Azure meter costs belong to the same agent cost model;
- the reporting period and allocation method.

No named-user or message-level cost should be shown by default.

## How this lands in the tracker later

| Tracker field | Role |
| --- | --- |
| `agents.id` | Join key |
| `copilot_studio_url` | Human link only — not a telemetry id |
| `title` | Display only |
| New columns (future) | Last-refreshed-at, WAU, sessions, credits billed/non-billed, optional cost |

Identity mapping (BotId / environment id → `agents.id`) is part of the one-agent proof, not a guess from the title.

## Sequence that does not need a UI yet

1. Confirm the agent lives in a full Power Platform environment and transcript saving is on.
2. Grant **Bot Transcript Viewer** to one person; pull one week for one live Teams agent.
3. Pull the same agent’s Copilot Credits for that month.
4. Nabih/Brian lock the metric list and privacy rules.
5. Then AIBU-80.

## Verification and test record

| Check | Result | Evidence |
| --- | --- | --- |
| Jira scope read | Passed | AIBU-113 has a research/approach description; 114/118/120 have titles only |
| Tracker architecture inspected | Passed | React browser client, Supabase aggregates proposed, public token route excluded |
| Microsoft source capability checked | Passed (documentation only) | Primary references below |
| Digital Realty transcript pull | Not run — access required | Needs environment confirmation and Bot Transcript Viewer/admin access |
| Digital Realty credit report pull | Not run — access required | Needs Power Platform licensing/admin access |
| Finance/tokenomics alignment | Not run — approval required | No internal rate, invoice, or allocation model was supplied |
| Dashboard implementation test | Not applicable | AIBU-80 intentionally remains on hold |

## What this ticket set does **not** do

- Access the live tenant or store transcripts.
- Choose final metrics (AIBU-80 / Nabih).
- Migrate hosting (see `docs/supabase-azure-migration-options.md`).
- Turn on Application Insights (can capture message text and identity).

## Primary references

- Microsoft Learn: [Control how transcripts are retained and accessed](https://learn.microsoft.com/en-us/microsoft-copilot-studio/admin-transcript-controls)
- Microsoft Learn: [Develop a custom analytics strategy](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/custom-analytics-strategy)
- Microsoft Learn: [Conversation transcripts from Power Apps](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-powerapps)
- Microsoft Learn: [Downloaded session data](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-studio)
- Microsoft Learn: [Agent-level telemetry with Application Insights](https://learn.microsoft.com/en-us/microsoft-copilot-studio/advanced-bot-framework-composer-capture-telemetry)
- Microsoft Learn: [Manage Copilot Credits and capacity](https://learn.microsoft.com/en-us/power-platform/admin/manage-copilot-studio-copilot-credits-capacity)
- Microsoft Learn: [Pay-as-you-go usage and costs](https://learn.microsoft.com/en-us/power-platform/admin/pay-as-you-go-usage-costs)
- Repository: `docs/usage-and-intake-recommendations.md`
- Discovery contract: PR [#30](https://github.com/nsabeh85/agent-tracker-dashboard/pull/30)
