-- AUD-002: prevent public view from bypassing underlying table RLS.
-- The view is intentionally exposed to the API, so keep SELECT grants intact
-- but execute it with the privileges/RLS context of the caller.
ALTER VIEW public.event_ticket_stats
SET (security_invoker = true);
