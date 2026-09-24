# Copilot Studio metrics and dashboard approach

**Jira:** [AIBU-113](https://digitalrealty-cdo.atlassian.net/browse/AIBU-113), [AIBU-114](https://digitalrealty-cdo.atlassian.net/browse/AIBU-114), [AIBU-118](https://digitalrealty-cdo.atlassian.net/browse/AIBU-118), [AIBU-120](https://digitalrealty-cdo.atlassian.net/browse/AIBU-120)  
**Related:** [AIBU-77](https://digitalrealty-cdo.atlassian.net/browse/AIBU-77) (written rec, Done), [AIBU-80](https://digitalrealty-cdo.atlassian.net/browse/AIBU-80) (UI, hold)  
**Prepared:** September 24, 2026  
**Status:** Approach documented — not a live tenant pull, not a built dashboard

This is one write-up for four overlapping tickets: define the approach, propose metrics, align them with cost/tokenomics, and document that for review.

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
| Weekly / monthly active users | Distinct hashed user ids, exclude design-mode | Dataverse | Pseudonymous |
| Sessions | Reconstructed conversations (merge split transcript rows) | Dataverse | Aggregate |
| Teams share | Sessions where channel is `msteams` | Dataverse | Aggregate |
| Outcome rate | Approved “success” outcomes ÷ eligible completed sessions | Dataverse | Aggregate |
| Credits consumed | Billed and non-billed credits for the mapped agent | Power Platform | Commercially sensitive |
| Estimated cost | Credits × finance rate, **or** a number finance posts | Credits + finance | Commercially sensitive |
| Estimated savings | Existing tracker savings, already in Supabase | Tracker | Business estimate |
| Runtime failure / latency | Only if Application Insights is already on | App Insights | Aggregate |

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

What Nabih/finance still must approve: the conversion rule, whether non-billed credits appear on the board, and whether any named-user or message-level cost is allowed (default: no).

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

## What this ticket set does **not** do

- Access the live tenant or store transcripts.
- Choose final metrics (AIBU-80 / Nabih).
- Migrate hosting (see `docs/supabase-azure-migration-options.md`).
- Turn on Application Insights (can capture message text and identity).

**References:** Microsoft Learn on conversation transcripts, transcript access controls, and Copilot Credits; `docs/usage-and-intake-recommendations.md`; PR [#30](https://github.com/nsabeh85/agent-tracker-dashboard/pull/30) discovery contract.
