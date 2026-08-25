-- Run in the Supabase SQL editor after the migrations (bypasses RLS).
-- Replace with the real work emails that will receive magic links.

INSERT INTO public.admins (email, display_name)
VALUES
  ('nsabeh@digitalrealty.com', 'Nabih'),
  ('mark@example.com', 'Mark')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name;
