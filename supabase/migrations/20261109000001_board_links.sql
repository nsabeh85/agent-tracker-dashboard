-- Saved board links. Administrators paste the URL; everyone signed in can open it.
-- Rollback: DROP TABLE public.board_links;

CREATE TABLE IF NOT EXISTS public.board_links (
  link_key text PRIMARY KEY CHECK (link_key IN ('approval_package', 'confluence')),
  url text NOT NULL DEFAULT '',
  CONSTRAINT board_links_https CHECK (url = '' OR url ~ '^https://')
);

INSERT INTO public.board_links (link_key, url)
VALUES ('approval_package', ''), ('confluence', '')
ON CONFLICT (link_key) DO NOTHING;

ALTER TABLE public.board_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS board_links_select ON public.board_links;
CREATE POLICY board_links_select ON public.board_links
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS board_links_update ON public.board_links;
CREATE POLICY board_links_update ON public.board_links
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, UPDATE ON public.board_links TO authenticated;
