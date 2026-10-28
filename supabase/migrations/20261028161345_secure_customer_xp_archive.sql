-- The XP archive is for administrative audit only; never expose it through PostgREST.
alter table public.customer_xp_events_archive enable row level security;
revoke all on table public.customer_xp_events_archive from anon, authenticated;
