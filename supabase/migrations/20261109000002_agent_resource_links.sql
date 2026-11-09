-- Each agent has its own approval package and Confluence page.
-- Rollback: ALTER TABLE public.agents DROP COLUMN approval_package_url, DROP COLUMN confluence_url;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS approval_package_url text,
  ADD COLUMN IF NOT EXISTS confluence_url text;

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_approval_package_https;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_approval_package_https
  CHECK (
    approval_package_url IS NULL
    OR approval_package_url = ''
    OR approval_package_url ~ '^https://'
  );

ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS agents_confluence_https;
ALTER TABLE public.agents
  ADD CONSTRAINT agents_confluence_https
  CHECK (
    confluence_url IS NULL
    OR confluence_url = ''
    OR confluence_url ~ '^https://'
  );

DROP TABLE IF EXISTS public.board_links;
