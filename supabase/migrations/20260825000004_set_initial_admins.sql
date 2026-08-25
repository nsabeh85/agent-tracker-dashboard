-- Start with exactly two editors. Additional admins can be added later
-- from the authenticated Admin Settings page.

DELETE FROM public.admins
WHERE email NOT IN (
  'nsabeh@digitalrealty.com',
  'mseay@digitalrealty.com'
);

INSERT INTO public.admins (email, display_name)
VALUES
  ('nsabeh@digitalrealty.com', 'Nabih'),
  ('mseay@digitalrealty.com', 'Mark')
ON CONFLICT (email) DO UPDATE
SET display_name = EXCLUDED.display_name;
