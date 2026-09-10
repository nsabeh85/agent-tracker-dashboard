-- Run in the Supabase SQL editor after the migrations (bypasses RLS).
-- Initial editors. Additional admins can be managed from Admin Settings.

INSERT INTO public.admins (email, display_name)
VALUES
  ('llawhon@digitalrealty.com', 'Lauren Lawhon'),
  ('nsabeh@digitalrealty.com', 'Nabih Sabeh'),
  ('mseay@digitalrealty.com', 'Mark Seay')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name;
