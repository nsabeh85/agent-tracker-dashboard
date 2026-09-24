# Architecture AI / Microsoft enablement — training plan

**Jira:** [AIBU-83](https://digitalrealty-cdo.atlassian.net/browse/AIBU-83) Architect AI Solutions for Biz Productivity Training, [AIBU-122](https://digitalrealty-cdo.atlassian.net/browse/AIBU-122) Architecture AI / Microsoft Enablement Tasks  
**Related epic:** [AIBU-27](https://digitalrealty-cdo.atlassian.net/browse/AIBU-27) Copilot Studio Academy  
**Prepared:** September 24, 2026  
**Status:** Unapproved draft — sessions not scheduled, tenant access not assumed

AIBU-83 and AIBU-122 had no descriptions or acceptance criteria. This document is an
optional draft only. It does **not** establish that the two tickets share scope, and it does
not complete either ticket. AIBU-83 is being handled separately as a training program.
AIBU-122 must remain open until its reporter or Nabih defines the requested Microsoft
enablement tasks.

## Audience and outcome

**Audience:** Digital Realty people who will **architect or sponsor** Copilot Studio solutions (not end users of a finished agent).

**Outcome after the series:** a participant can describe when Copilot Studio is the right tool, what an intake ticket must contain, what “approved to build” means, how usage and cost will be measured later, and what they must **not** put in a prompt or knowledge source.

## Proposed modules (90 minutes each, or a half-day block)

| # | Module | What we cover | What we do not cover |
| --- | --- | --- | --- |
| 1 | Problem framing | Business outcome, users, systems, sensitive data, success metric | Building the agent |
| 2 | Microsoft map | Copilot Studio vs M365 Copilot vs Azure OpenAI; Teams publish vs Dataverse environment | Tenant admin how-to |
| 3 | Intake and tracker | PCT **AI Request**, what the tracker records, why ownership and go-live stay human | Wiring Jira Automation (IT/Jira admin) |
| 4 | Data and risk | SharePoint/labels, what transcripts store, hashed users vs named users | Legal sign-off (they still own it) |
| 5 | Cost literacy | Copilot Credits vs “tokens” vs tracker savings | Finance-approved dollar rates |
| 6 | Operate | Stages on the tracker, when to pause, who owns the live agent | Fake observability numbers |

Hands-on in module 2–3 can be a **demo environment** or screenshots if production access is not granted.

## Candidate enablement task backlog (requires scope approval)

These are the work items behind the plan. Check them off as people and access appear.

1. Confirm sponsor and who must attend (Nabih).
2. Confirm whether sessions are Architecture-only or open to BU champions.
3. Book a demo tenant or screenshot pack (Power Platform admin).
4. Slide outline from the six modules above (can be drafted without tenant access).
5. One worked example from a real PCT AI Request (redact emails and customer data).
6. Point to tracker login path and who is an admin vs viewer.
7. After AIBU-79’s Approved status exists, show “request appears on the board” as a demo — not before.
8. Feedback form and a follow-up office hour.

## Constraints (do not skip in the materials)

- No secrets, connection strings, or production transcript dumps in slides.
- Do not promise named-user usage reports unless Legal/IT have allowed an Entra join.
- Do not treat Teams admin as the usage data owner.
- Do not build agents in Dataverse for Teams if we need transcripts later.

## What Nabih or the reporter must define/approve

- Who the training is for and when it runs.
- Whether a demo environment is allowed.
- Whether Architecture AI is the delivery team or Microsoft partners.
- Whether AIBU-122 is related to AIBU-83 at all.
- Acceptance criteria and expected evidence for AIBU-122.

Until those answers exist, this document is not a close-out artifact.
