# Supabase-to-Azure migration options

**Jira:** [AIBU-119](https://digitalrealty-cdo.atlassian.net/browse/AIBU-119) evaluate options, [AIBU-121](https://digitalrealty-cdo.atlassian.net/browse/AIBU-121) document findings  
**Prepared:** September 24, 2026  
**Status:** Evaluation — no migration has been started

Findings from the current Agent Tracker repo and how it is already hosted. No Azure or Supabase production settings were changed. No secrets are listed here.

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

### Option A — Stay hybrid (recommended until Nabih says otherwise)

Keep Azure SWA for the site. Keep Supabase for Postgres, RLS, Realtime, Auth (until Entra), and the Jira Edge Function.

- Least disruption; matches what is in production now.
- Jira webhook and all tracker RPCs keep working.
- Remaining work is Entra on SWA/Supabase, not a database move.

**Move only if** security, procurement, or data-residency policy forbids Supabase for this data.

### Option B — Lift Postgres to Azure Database for PostgreSQL, keep the app as-is

Dump/restore the schema and data, point the client at Azure Postgres, rewrite RLS and `SECURITY DEFINER` functions for Azure AD / database roles, replace Realtime (Azure SignalR, polling, or drop live refresh), replace Edge Functions with Azure Functions, replace Auth with SWA Easy Auth / Entra.

- Highest fidelity to “everything in Azure.”
- Highest rewrite cost: auth, RLS, every RPC, Jira ingest, Realtime.
- Easy to get wrong on row-level security (admins vs all `@digitalrealty.com` vs public tokens).

### Option C — Azure Functions + Azure SQL or Cosmos

Would throw away the existing Postgres migrations and RPC layer. Cosmos was already rejected as the default observability store in the AIBU-77 discovery. Do not use this for the tracker of record unless an enterprise platform team already mandates it.

### Option D — Static site only, no backend move

Already true for HTML/JS. Does not remove the Supabase dependency.

## What a real Azure cutover would have to replace

| Supabase capability | Closest Azure stand-in | Risk |
| --- | --- | --- |
| Postgres + migrations | Azure Database for PostgreSQL Flexible Server | Schema port is straightforward; **RLS and GRANTs are not** |
| `is_admin` / `is_dlr_user` RLS | Equivalent policies plus Entra groups or an `admins` table | Easy to over-grant |
| RPCs (`create_agent`, Jira import, stage advance, comments) | Azure Functions calling Postgres with a **least-privilege** identity | Must not use a connection string in the browser |
| Edge Function + `JIRA_WEBHOOK_SECRET` | Azure Function, secret in Key Vault, no JWT from Jira | Redeploy AIBU-79 |
| Auth email/password | **Entra ID** (already planned) | Should happen even if we keep Supabase |
| Realtime | SignalR, or poll | UX change |
| Dashboard SQL editor / `service_role` | Azure portal + managed identity | Operator runbooks change |

Secrets stay in GitHub Actions and Key Vault / Supabase secrets. Never `VITE_` for the Jira webhook or a database password.

## Cost and effort (order of magnitude)

Not a quote. Relative only:

- **A (hybrid):** days for Entra; no data migration.
- **B (Postgres on Azure):** weeks; needs a freeze window, dual-run, and a Jira ingest cutover.
- **C:** equivalent to a rewrite.

## Recommendation

1. **Do not migrate the database in this sprint.** The site is already on Azure SWA. The expensive, risky part is Auth + RLS + RPCs + the Jira function, not the static host.
2. **Do** plan Entra ID for sign-in (README already calls the password flow a stopgap). That addresses “behind the auth wall” for employees without moving Postgres.
3. **Revisit Option B** only after a written policy reason (residency, vendor, enterprise standard) and a named owner for the cutover.

## Nabih still needs to decide

- Is Supabase acceptable for tracker data going forward, or is Azure Postgres mandatory?
- Entra rollout timing (can proceed without a database move).
- Who owns Azure Postgres, Key Vault, and Function apps if Option B is chosen.

## Findings summary (AIBU-121)

- Azure already hosts the UI.
- Supabase still hosts identity, data, live updates, and Jira ingest.
- A full move is a platform rewrite, not a checkbox.
- Safest next technical step is Entra, not lifting Postgres.
