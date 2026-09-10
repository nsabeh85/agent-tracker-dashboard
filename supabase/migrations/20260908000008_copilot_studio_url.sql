-- Optional HTTPS link from a tracker record to the live Copilot Studio agent.
-- Manual for now so operators can jump past name-mismatch searches.

ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS copilot_studio_url text NULL;

ALTER TABLE public.agents
DROP CONSTRAINT IF EXISTS agents_copilot_studio_url_https;

ALTER TABLE public.agents
ADD CONSTRAINT agents_copilot_studio_url_https CHECK (
  copilot_studio_url IS NULL
  OR copilot_studio_url ~* '^https://'
);
