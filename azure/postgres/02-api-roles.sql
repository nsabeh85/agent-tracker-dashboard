-- Run after the tracker migrations. Passwords are psql variables, not stored here.
-- authenticator is the PostgREST login and cannot read tables until it switches role.
-- auth_service is the sign-in API. It can read passwords and check is_admin().

CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD :'authenticator_password';
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public TO authenticator;

CREATE ROLE auth_service LOGIN PASSWORD :'auth_service_password';
GRANT USAGE ON SCHEMA app_private TO auth_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON app_private.users TO auth_service;
GRANT authenticated TO auth_service;
GRANT USAGE ON SCHEMA public TO auth_service;
GRANT EXECUTE ON FUNCTION public.is_admin() TO auth_service;
GRANT EXECUTE ON FUNCTION public.import_approved_jira_request(
  text, text, text, text, text, text, text, text, public.agent_priority, text
) TO auth_service;
