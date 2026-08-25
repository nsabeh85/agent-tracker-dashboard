-- Run in the Supabase SQL editor after the migrations (bypasses RLS).
-- Initial editors. Additional admins can be managed from Admin Settings.

INSERT INTO public.admins (email, display_name)
VALUES
  ('nsabeh@digitalrealty.com', 'Nabih'),
  ('mseay@digitalrealty.com', 'Mark')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name;
