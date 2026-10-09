# Copilot Studio Agent Tracker

The Copilot Studio Agent Tracker is the CDO team's shared view of agent requests from intake
through production. It shows the owner, department, priority, target date, lifecycle stage,
sub-step progress, comments, source Jira request, Copilot Studio link, and estimated and realized
savings for each agent.

The production tracker runs entirely on Azure. Digital Realty employees sign in with Microsoft
Entra ID. Employees may view the board, explicit administrators may change it, and public
tracking links expose only the single agent named by the link.

## Quick links

- [Live dashboard](https://agreeable-hill-03571850f.7.azurestaticapps.net/)
- [GitHub repository](https://github.com/nsabeh85/agent-tracker-dashboard)
- [Azure migration work — AIBU-127](https://digitalrealty-cdo.atlassian.net/browse/AIBU-127)
- [Jira intake work — AIBU-79](https://digitalrealty-cdo.atlassian.net/browse/AIBU-79)
- [Agent usage tracking — AIBU-77](https://digitalrealty-cdo.atlassian.net/browse/AIBU-77)
- [Production lifecycle operating model](https://digitalrealty-cdo.atlassian.net/wiki/spaces/CA/pages/174096386/Copilot+Studio+Production+Lifecycle+and+Certification+Operating+Model)
- [Per-agent documentation template](https://digitalrealty-cdo.atlassian.net/wiki/spaces/CA/pages/251396097/Copilot+Studio+Agents+Documentation+Skeleton)

## Current status

The Azure migration is complete for the live application:

- Microsoft SSO works.
- The production board reads and writes Azure Database for PostgreSQL.
- The live rows, lifecycle catalog, owners, departments, administrators, stages, sub-steps, and
  comments were copied from Supabase and verified.
- Public tracking links work without sign-in.
- The frontend and API are deployed from GitHub and Azure.

The only operational integration still left on Supabase is the Jira webhook. Tony Lorino and
Aaron are responsible for the Jira Automation rule. Until the rule is moved and a historical
backfill is reconciled, the Supabase project must remain available.

The September 1 Supabase backup is not application data. It contains 26 pending requests from an
earlier Jira-import attempt. The live app never reads those tables. Keep the snapshot until Jira
backfill is complete, then reconcile by Jira issue link before deleting it.

## What the dashboard does

### Lifecycle tracking

Every agent moves through Requested, Scoping, Building, Testing, and Live. Each stage has its own
sub-steps, expected duration, actual start and end dates, status, and owners. The tracker flags
late work, requires a go-live date before Testing, and prevents an agent from moving Live while
earlier work remains incomplete.

### Portfolio view

The dashboard can filter by lifecycle stage, owner, department, and board status. It can sort by
target date, priority, or last update. Summary cards and savings totals respond to the active
filters. Backlog requests are hidden by default.

### Agent record

An agent record includes:

- title, requester, department, description, priority, and board status;
- one or more owners and per-stage owners;
- target go-live date and source request link;
- Copilot Studio link;
- stage and sub-step progress;
- threaded comments with author-aware edit and delete rules;
- monthly or yearly savings estimate; and
- a stable public tracking link.

### Savings

The board annualizes monthly estimates and shows realized savings as months in production
multiplied by the monthly savings rate.

[PR #40](https://github.com/nsabeh85/agent-tracker-dashboard/pull/40) adds a production savings
check-in. For every agent on the Live stage, it identifies day 30, 60, 90, 120, and each later
30-day checkpoint. Justin Taylor is the only non-admin who may update the saved-cost field.
The email goes to Justin Taylor, copies Ajay Sudra, and appears to come from Lauren Lawhon.

That pull request must not be enabled for email until an Entra/Microsoft 365 administrator:

1. enables the system-assigned managed identity for `app-agtracker-api`;
2. grants that identity Microsoft Graph `Mail.Send` application permission with admin consent;
3. restricts Exchange application access to `llawhon@digitalrealty.com`; and
4. confirms the restriction before a test email is sent.

The production implementation should use managed identity, not a client secret. The daily process
is only a checkpoint scan: on most days it sends nothing. It sends one message only when an agent
has reached an unsent 30-day checkpoint.

### Public links

`/track/:token` and signed-out `/agents/:id` views show one agent and its public progress.
Anonymous visitors cannot list or search the board tables.

### Settings

Administrators manage the stage catalog, sub-steps, owners, departments, and administrator
allowlist. Owners are display names on requests; they are not login accounts.

## Access model

Access is enforced in the database as well as in the interface.

- `@digitalrealty.com` Microsoft identities can view the internal board.
- Emails listed in `public.admins` can create and edit agents and settings.
- Justin Taylor receives a narrow exception to update savings on agents that are Live; this is
  part of PR #40 and does not grant broader administrator access.
- Other domains and anonymous users cannot query tracker tables.
- Public tracking functions return only the single requested agent.
- The Jira import function can be run by the API role, not by a signed-in browser user.

Microsoft SSO uses Azure Static Web Apps authentication. The API validates the Static Web Apps
client principal and creates a short-lived PostgREST token on the private API hop. No Microsoft
password is handled or stored by the tracker.

## Azure architecture

```text
Browser
  │
  ├── Microsoft Entra sign-in via Azure Static Web Apps
  │
  ▼
Azure Static Web App: agent-tracker-dashboard
  │  React/Vite frontend
  │  /api reverse proxy
  ▼
Azure App Service: app-agtracker-api
  │  Node.js API + local PostgREST
  │  Key Vault references for database and signing configuration
  ▼
Azure Database for PostgreSQL: psql-agtracker01
```

Resources are in subscription **SalesGPT Demo**, resource group `rg-agent-tracker`, region
**East US 2**:

- Static Web App: `agent-tracker-dashboard`
- App Service: `app-agtracker-api`
- App Service plan: `asp-agtracker` (Linux B1)
- PostgreSQL flexible server: `psql-agtracker01`
- Key Vault: `kv-agtracker-eus2`

The App Service's public hostname is protected by Easy Auth and returns 401 directly. The Static
Web App is the intended entry point and forwards `/api/*` while adding the signed-in principal.
PostgREST listens only on the App Service container loopback interface.

## Data model

Core tables:

- `agents`
- `stages` and `substeps`
- `agent_stages` and `agent_substeps`
- `owners`, `agent_owners`, and `agent_stage_owners`
- `departments`
- `comments`
- `admins`
- `savings_checkins` after PR #40 is deployed

Row Level Security is enabled on application tables. SQL migrations remain under
`supabase/migrations` for historical continuity; despite the folder name, the production
database is Azure PostgreSQL. Azure compatibility and role setup live under `azure/postgres`.

At the migration verification point, Azure held 5 live board agents, 25 agent-stage rows,
70 agent-substep rows, 9 comments, 4 owners, 5 departments, and 4 administrator rows. Treat these
as migration audit counts, not permanent expected values; normal use changes them.

## Jira intake

The tracker endpoint accepts any PCT issue whose Jira issue type is **AI Request** and creates it
as `pending_approval`. The team reviews it and moves an unapproved request to Backlog. Later
events update only Jira-owned fields: title, requester, department, description, priority, and
source URL. They do not overwrite tracker owners, lifecycle, savings, go-live date, or Copilot
Studio URL. The source URL prevents duplicate agents for the same Jira request.

Current state:

- The Azure route is `POST /api/jira/import`.
- The Jira shared secret has not been moved to Azure.
- No Jira Automation rule points to Azure.
- Existing Jira requests require a one-time backfill; create/update triggers alone do not import
  historical tickets.
- Jira intake is therefore parked and [AIBU-79](https://digitalrealty-cdo.atlassian.net/browse/AIBU-79)
  remains in progress.

Never put the webhook secret in the frontend, Git, Jira, Confluence, or chat. Store it in Azure
Key Vault and expose it to the API through a Key Vault reference.

## Repository layout

```text
src/                    React application
src/components/         Shared UI
src/hooks/              Tracker data hooks
src/lib/                Auth, schedule, savings, intake, and validation logic
src/pages/              Dashboard, agent, login, settings, and public pages
api/                    Node API, PostgREST launcher, auth, Jira and email handlers
azure/postgres/         Azure PostgreSQL compatibility and API-role setup
supabase/migrations/    Ordered PostgreSQL schema history
supabase/functions/     Legacy Supabase functions retained for reference
public/                 Static Web Apps routing configuration
.github/workflows/      Production frontend deployment
docs/                   Detailed intake and usage recommendations
```

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_API_URL` to use Azure. In production it is `/api`. With no Azure or Supabase
configuration, the app renders synthetic demo data so the interface can be reviewed safely.

The `VITE_SUPABASE_*` variables exist only as a temporary fallback. New production work must use
Azure. Do not add secrets to `.env.example`, GitHub, documentation, screenshots, or frontend
`VITE_*` variables.

## Deployment

### Frontend

`.github/workflows/azure-static-web-apps.yml` runs on pushes to `main`. It installs dependencies,
builds with Node 22, and deploys `dist` to Azure Static Web Apps. The GitHub Actions secrets are:

- `AZURE_STATIC_WEB_APPS_API_TOKEN`
- `VITE_API_URL` with value `/api`

`public/staticwebapp.config.json` falls application routes back to `index.html` and excludes
`/api/*` and `/.auth/*`.

### API

The API runs from `api/server.mjs`. `api/start.sh` installs runtime dependencies if needed,
downloads the pinned PostgREST binary when absent, starts PostgREST on loopback, and starts Node.
Required App Service setting names are:

- `DATABASE_URL`
- `PGRST_DB_URI`
- `JWT_SECRET`
- `POSTGREST_BIN`
- `WEBSITES_PORT`

Their sensitive values are Key Vault references. Do not print or copy them into documentation.

### Database changes

Apply migrations with the PostgreSQL administrator through a secure connection. Migrations
should be idempotent where practical. Verify permissions and Row Level Security after each
change. For a rollback, reverse only the new objects and preserve application rows unless the
change explicitly requires data removal.

## Testing

Run before every pull request:

```bash
npm test
npx tsc -b --pretty false --noEmit
npm run lint
npm run build
node --check api/server.mjs
```

The October 9 migration audit verified:

- every frontend table and column exists in Azure;
- all referenced database functions exist;
- no orphaned stages, sub-steps, owners, or comments;
- every agent has all catalog stages and sub-steps;
- administrator, viewer, outside-domain, and anonymous permissions;
- public link behavior;
- create, owner, stage, sub-step, comment, and Jira-import functions inside rolled-back
  transactions; and
- live site, health, authentication, unauthorized, and not-found responses.

Never run write-path checks on production without a transaction and an explicit rollback.

## Operations and troubleshooting

- **Sign-in loops or loading never ends:** check `/.auth/me`, then `/api/auth/session`, then the
  signed-in PostgREST request. The UI clears loading and shows the query error.
- **Board shows zero agents:** inspect the red request error before changing data. A prior failure
  was caused by passing `/api` where the URL library required a full same-origin URL.
- **API health:** `GET /api/health` should return `{"ok":true}`.
- **Direct API hostname returns 401:** expected; Easy Auth protects it.
- **Anonymous table read returns 401:** expected; public access must use a public RPC.
- **Azure writes return authorization errors after PIM activation:** sign in to Azure CLI again
  so the access token contains the activated role.
- **Jira tickets do not appear:** the Jira Automation rule is not yet connected to Azure.
- **Savings email does not send:** PR #40 is pending and Microsoft Graph send-as approval is still
  required.

## Security and data handling

- Do not store passwords, tokens, database URLs, connection strings, deployment tokens, webhook
  secrets, or private keys in the repository or documentation.
- Use Azure Key Vault references for API secrets.
- Keep Microsoft Graph mail permission restricted to Lauren Lawhon's mailbox.
- Keep database roles least-privileged: browser users rely on RLS; the Jira API role may execute
  the import function; the database administrator is for migrations only.
- Do not log employee, customer, financial, or operational payloads.
- Public links are view-only and should still be treated as shareable access to one agent.

## Theme

The tracker defaults to dark mode. The header toggle stores the preference in `localStorage`
under `agent-tracker-theme`, and an inline script applies it before first paint.

## Related documentation

- [`docs/jira-approved-intake.md`](docs/jira-approved-intake.md)
- [`docs/usage-and-intake-recommendations.md`](docs/usage-and-intake-recommendations.md)
- [`azure/postgres/00-auth-compat.sql`](azure/postgres/00-auth-compat.sql)
- [`azure/postgres/02-api-roles.sql`](azure/postgres/02-api-roles.sql)
