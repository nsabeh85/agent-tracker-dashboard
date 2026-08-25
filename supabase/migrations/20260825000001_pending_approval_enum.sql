-- Add pending_approval without using the new label in this transaction
-- (Postgres cannot use a newly added enum value until the transaction commits).

ALTER TYPE public.agent_status ADD VALUE IF NOT EXISTS 'pending_approval';
