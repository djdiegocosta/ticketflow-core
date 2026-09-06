-- AUD-016: version the production Storage buckets in migration history.
-- Supabase Storage buckets are rows in storage.buckets and are not captured by
-- schema-only migrations. Keep this migration idempotent so it is safe to replay.
insert into storage.buckets (id, name, public)
values
  ('event-images', 'event-images', true),
  ('organization-logos', 'organization-logos', true),
  ('client-banners', 'client-banners', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
