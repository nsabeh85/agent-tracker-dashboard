-- Seed the global stage and sub-step catalog. Admins must be inserted separately
-- with real emails (see README) so the allowlist matches Auth users.

INSERT INTO public.stages (name, sort_order, default_duration_days)
VALUES
  ('Requested', 1, 5),
  ('Scoping', 2, 10),
  ('Building', 3, 21),
  ('Testing', 4, 10),
  ('Live', 5, 30);

INSERT INTO public.substeps (stage_id, name, sort_order, default_duration_days)
SELECT s.id, v.name, v.sort_order, v.default_duration_days
FROM public.stages s
JOIN (
  VALUES
    ('Requested', 'Intake form received', 1, 2),
    ('Requested', 'Requester confirmed', 2, 3),
    ('Scoping', 'Use case defined', 1, 3),
    ('Scoping', 'Data sources identified', 2, 4),
    ('Scoping', 'Effort estimated', 3, 3),
    ('Building', 'Data cleaning and prep', 1, 7),
    ('Building', 'Connectors configured', 2, 5),
    ('Building', 'Topics and prompts authored', 3, 7),
    ('Building', 'Internal review', 4, 2),
    ('Testing', 'Test environment validation', 1, 3),
    ('Testing', 'Requester UAT', 2, 5),
    ('Testing', 'Prod deployment', 3, 2),
    ('Live', 'Handover to owner', 1, 2),
    ('Live', 'Adoption check at 30 days', 2, 30)
) AS v(stage_name, name, sort_order, default_duration_days)
  ON s.name = v.stage_name;
