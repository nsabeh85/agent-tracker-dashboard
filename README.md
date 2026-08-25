# Copilot Studio Agent Tracker

Shared status dashboard for Copilot Studio agent requests. Anyone with the link can view and update requests, stages, comments, and settings. There is no login.

## Stack

Vite, React, TypeScript, Tailwind CSS, and Supabase (Postgres, RLS, Realtime). There is no app server. Deploy the static build to Vercel, Netlify, or Azure Static Web Apps.

## 1. Create the Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Apply migrations from `supabase/migrations` with the CLI (`supabase link` then `supabase db push`) or paste them in order into the SQL editor. Later files add a **Pending approval** status, load the current PCT AI Request backlog (40 rows), and open writes to the public `anon` key. The backlog seed is idempotent.

## 2. Run the app

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.

```bash
npm install
npm run dev
```

Without those two variables the app runs in preview mode: it renders the sample requests in
`src/lib/demoData.ts` behind an amber banner so the design can be reviewed before a project
exists. Real data replaces it as soon as the keys are present.

## 3. Deploy

Build with `npm run build`. The host must rewrite SPA routes to `index.html` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` **at build time** (Vite inlines them).

### Azure Static Web Apps

`public/staticwebapp.config.json` is copied into `dist/` and falls client routes back to `index.html`. `.github/workflows/azure-static-web-apps.yml` builds on Node 22 and uploads `dist/`.

1. In Azure Portal, create a **Static Web App** (Free or Standard). You can skip the portal’s generated workflow; this repo already has one.
2. In GitHub → **Settings → Secrets and variables → Actions**, add:
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — deployment token from the Static Web App (**Manage deployment token**)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Push to `main` (or open a PR for a preview environment). Do not store the Supabase **service role** key in GitHub or Azure.

If you create the Static Web App with GitHub connected, Azure may try to commit a second workflow. Keep this repo’s file and paste the token into `AZURE_STATIC_WEB_APPS_API_TOKEN` instead.

### Vercel or Netlify

Point the host at the repo; `vercel.json` and `netlify.toml` already rewrite SPA routes to `index.html`. Set the same two `VITE_*` variables in the host.

## Theme

The app ships dark by default. The header toggle switches to light and stores the choice in
`localStorage` under `agent-tracker-theme`; an inline script in `index.html` applies the class
before first paint so there is no flash. Tailwind uses the class strategy, so styles are written
as `dark:` variants rather than media queries.

## Access model

Row Level Security is the gate. `anon` and `authenticated` can `SELECT`, `INSERT`, `UPDATE`, and `DELETE` tracker tables, and can call `create_agent`. Anyone who has the published URL and anon key can change data. Treat the site as an internal shared board, not a public internet app.

The unused `admins` table remains in the schema from earlier versions but is not used by the UI.

## Regenerating types

After schema changes:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

## Tests

```bash
npm test
npm run build
```
