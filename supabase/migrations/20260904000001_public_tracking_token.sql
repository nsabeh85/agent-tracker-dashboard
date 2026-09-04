-- Unguessable public tracking token per agent request.
-- Used by the no-login /track/:token page. Distinct from agents.id so
-- sequential or leaked internal IDs cannot be used to guess a tracker URL.
-- Links stay valid after go-live; deleting the agent is what retires the page.

ALTER TABLE public.agents
  ADD COLUMN public_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

COMMENT ON COLUMN public.agents.public_token IS
  'Unguessable token for the public requester tracker URL. Lives until the agent row is deleted.';
