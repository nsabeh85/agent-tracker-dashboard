# Copilot Studio Agent Tracker

Public status dashboard for Copilot Studio agent requests. Viewers need no login. Two admins (Nabih and Mark) sign in with a Supabase magic link to update milestones and comments.

## Stack

Vite, React, TypeScript, Tailwind CSS, and Supabase (Postgres, Auth, RLS, Realtime). There is no app server. Deploy the static build to Vercel or Netlify.

## 1. Create the Supabase project

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Apply migrations from `supabase/migrations` with the CLI (`supabase link` then `supabase db push`) or paste them in order into the SQL editor.
3. Enable Email / magic link in **Authentication → Providers**.
4. Set **Authentication → URL configuration** Site URL to your deployed origin. Add `http://localhost:5173` to Redirect URLs for local work.
5. Seed the admin allowlist. Edit `supabase/seed_admins.sql` with the real emails, then run it in the SQL editor (migrations cannot guess those addresses).

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

Build with `npm run build`. Point Vercel or Netlify at the repo; `vercel.json` and `netlify.toml` already rewrite SPA routes to `index.html`. Set the same two `VITE_*` environment variables in the host.

After deploy, add the production URL to Supabase Auth redirect URLs.

## Theme

The app ships dark by default. The header toggle switches to light and stores the choice in
`localStorage` under `agent-tracker-theme`; an inline script in `index.html` applies the class
before first paint so there is no flash. Tailwind uses the class strategy, so styles are written
as `dark:` variants rather than media queries.

## Access model

Row Level Security is the gate:

- `anon` and `authenticated` can `SELECT` tracker tables.
- `INSERT` / `UPDATE` / `DELETE` require `auth.jwt() ->> 'email'` to exist in `admins`.
- `admins` is readable by authenticated users only.

The UI hides write controls without a session. Do not treat that as security.

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
