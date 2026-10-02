# Supabase-to-Azure migration options

**Jira:** [AIBU-119](https://digitalrealty-cdo.atlassian.net/browse/AIBU-119) evaluate options, [AIBU-121](https://digitalrealty-cdo.atlassian.net/browse/AIBU-121) document findings  
**Prepared:** September 24, 2026  
**Status:** Formal options assessment — direction set, no migration has been started

## Decision of record

Supabase is an **interim** platform for this tracker. It is acceptable to keep running on it
today, but it is not the accepted end state, and the tracker will move to Azure. This was
stated by the project owner (Lauren Lawhon) on September 24, 2026 following a discussion with
Tony Aguilar. **Option B below is therefore the target direction, not an open question.**

Still unassigned: the Azure platform owner, the migration engineer(s) Tony named, the target
subscription and region, and the cost approval. Nothing in this document should be read as a
schedule or a cost estimate until those are filled in.

## Executive summary

The tracker frontend is already deployed through Azure Static Web Apps. Moving the remaining
Supabase services is not a hosting toggle: it replaces authentication, Postgres access
controls, RPCs, realtime subscriptions, and the Jira Edge Function. Given the decision above,
the question is no longer *whether* to move but *in what order and under whose ownership*.
The sequencing this evidence supports is Entra sign-in first, then the data and backend move,
with the validation gates in this document cleared before cutover.

## Scope, method, and evidence

This assessment uses the current repository, deployment workflow, migrations, auth code,
Supabase function code, and current Microsoft/Supabase product documentation.

No Digital Realty Azure subscription, resource group, Entra app registration, networking
configuration, cost data, Supabase organization controls, procurement terms, or security
policy was accessed. No Azure or Supabase production setting was changed. Consequently,
cost, policy, residency, network, and ownership statements are decision gaps—not assumed facts.

## What we run today

| Piece | Where it lives |
| --- | --- |
| React UI (Vite) | **Already on Azure Static Web Apps** via GitHub Actions (`Azure/static-web-apps-deploy`) |
| Employee sign-in | Supabase Auth (email/password stopgap). README says **Microsoft Entra ID is the planned replacement** |
| Database, RLS, RPCs | Supabase Postgres (`supabase/migrations`) |
| Live board updates | Supabase Realtime |
| Jira intake webhook | Supabase Edge Function `import-jira-request` + `SECURITY DEFINER` RPC (AIBU-79) |
| Public share links | Tokenized `/track/:token` routes; still go through Supabase |

The frontend is already Azure. The remaining question is whether **data, auth, realtime, and the Jira function** should leave Supabase.

## Options

### Option A — Stay hybrid (interim state only)

Keep Azure SWA for the site. Keep Supabase for Postgres, RLS, Realtime, Auth (until Entra), and the Jira Edge Function.

- Least disruption; matches what is in production now.
- Jira webhook and all tracker RPCs keep working.
- This is the **current** state and the safe place to sit while Option B is staffed and
  gated. It is explicitly not the end state.

### Option B — Lift Postgres to Azure Database for PostgreSQL (target)

Dump/restore the schema and data, but **do not point the browser directly at Azure
Postgres**. Add a least-privilege backend (for example Azure Functions) and Entra
authentication, then adapt the current RLS/RPC contract to pass trusted user/admin context.
Replace Realtime (Azure SignalR, polling, or remove live refresh) and replace Edge Functions
with Azure Functions.

- Highest fidelity to “everything in Azure.”
- Highest rewrite cost: auth, RLS, every RPC, Jira ingest, Realtime.
- Easy to get wrong on row-level security (admins vs all `@digitalrealty.com` vs public tokens).
- Static Web Apps' built-in database connector does not support managed identity for Azure
  Database for PostgreSQL Flexible Server. A backend can use a managed identity and Entra
  token; that distinction must be preserved in any design.

### Option C — Azure Functions + Azure SQL or Cosmos

Would throw away the existing Postgres migrations and RPC layer. Cosmos was already rejected as the default observability store in the AIBU-77 discovery. Do not use this for the tracker of record unless an enterprise platform team already mandates it.

### Option D — Static site only, no backend move

Already true for HTML/JS. Does not remove the Supabase dependency.

## What a real Azure cutover would have to replace

| Supabase capability | Closest Azure stand-in | Risk |
| --- | --- | --- |
| Postgres + migrations | Azure Database for PostgreSQL Flexible Server | Core schema is portable; current auth context and grants are Supabase-specific |
| `is_admin` / `is_dlr_user` RLS | Equivalent policies plus trusted Entra/app context | Easy to over-grant; public-token behavior must remain isolated |
| RPCs (`create_agent`, Jira import, stage advance, comments) | Azure Functions calling Postgres with a **least-privilege managed identity** | Never expose a connection string or Entra database token to the browser |
| Edge Function + `JIRA_WEBHOOK_SECRET` | Azure Function, secret in Key Vault, no JWT from Jira | Redeploy AIBU-79 |
| Auth email/password | **Entra ID** (already planned) | Should happen even if we keep Supabase |
| Realtime | SignalR, or poll | UX change |
| Dashboard SQL editor / `service_role` | Azure portal + managed identity | Operator runbooks change |

Secrets stay in GitHub Actions and Key Vault / Supabase secrets. Never `VITE_` for the Jira webhook or a database password.

## Relative effort (not a schedule or cost estimate)

No defensible duration or cost estimate is possible without tenant inventory, network
requirements, nonfunctional requirements, resource SKUs, and assigned engineers.

- **A (hybrid):** lowest change surface; no data migration.
- **B (Postgres on Azure):** material backend/security rewrite plus controlled data cutover.
- **C:** largest rewrite; abandons the current Postgres/RPC design.

## Recommended sequencing

1. **Entra ID sign-in first.** The README already calls the password flow a stopgap. Entra can
   be done against the current stack, removes the weakest control we have, and is required by
   Option B anyway, so none of the work is thrown away.
2. **Name the owners before any data moves.** An Azure platform owner for the subscription,
   resource group, Key Vault, and Postgres instance, plus the engineer(s) doing the cutover.
3. **Then execute Option B** through the gates below. The expensive, risky part is Auth + RLS +
   RPCs + the Jira function, not the static host, so budget the effort there.
4. **Do not cut over mid-sprint on shared infrastructure.** Rehearse in nonproduction first.

## Validation and cutover gates

Before executing Option B:

1. Inventory row counts, database size, extensions, RPCs, triggers, RLS policies, realtime
   subscriptions, public tracking links, and the Jira function.
2. Confirm Azure region, private-network requirements, backup/retention, RTO/RPO, and owners.
3. Confirm Entra group-to-admin/viewer mapping and public-link isolation.
4. Produce an Azure cost estimate from approved SKUs and expected workload.
5. Prototype one read, one admin write, one public tracking read, and one Jira webhook using
   least-privilege identities.
6. Rehearse export/import, reconciliation, rollback, and secret rotation in nonproduction.

## Verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Static frontend hosted on Azure | Verified in repository | `.github/workflows/azure-static-web-apps.yml` |
| Supabase used for browser auth/data/realtime | Verified in repository | Supabase client, auth hooks, realtime subscriptions, migrations |
| Jira ingest uses Supabase Edge Function | Verified on AIBU-79 branch/deployment history | `supabase/functions/import-jira-request` |
| Entra can be used with Supabase Auth | Documentation-validated | Supabase Azure OAuth provider reference below |
| Azure PostgreSQL/managed identity design | Documentation-validated with caveat | Backend MI supported; SWA database connector + Flex MI is not |
| Production Azure inventory/cost/network | Not run — access/owners required | No tenant or billing access provided |
| Migration prototype/performance/restore | Not run — approval required | No migration environment authorized |

## Open items (not blockers to the direction, blockers to the date)

- Named Azure platform owner for the subscription, resource group, Key Vault, and Postgres.
- Named migration engineer(s). Tony Aguilar has suggested candidates; record them here once
  confirmed.
- Target subscription, region, SKU, and who approves the recurring cost.
- Entra rollout timing (can proceed immediately and independently of the database move).
- How long Supabase stays live in parallel, and who decommissions it.

## Findings summary (AIBU-121)

- Azure already hosts the UI.
- Supabase still hosts identity, data, live updates, and Jira ingest, and is interim only.
- A full move is a platform rewrite, not a checkbox — plan it as one.
- First technical step is Entra sign-in; it is required either way and is not wasted work.

## Primary references

- Microsoft Learn: [Static Web Apps database configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/database-configuration)
- Microsoft Learn: [Microsoft Entra authentication for Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/security/security-entra-configure)
- Microsoft Learn: [Connect to PostgreSQL using managed identity](https://learn.microsoft.com/en-us/azure/postgresql/security/security-connect-with-managed-identity)
- Microsoft Learn: [Authorize Azure SignalR with managed identity](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-authorize-managed-identity)
- Supabase Docs: [Azure (Microsoft) social login](https://supabase.com/docs/guides/auth/social-login/auth-azure)
