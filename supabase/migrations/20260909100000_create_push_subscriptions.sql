-- Web Push subscriptions for authenticated TicketFlow operators/admins.
-- Private endpoint/key material is never exposed to clients through RLS.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, active);

create index if not exists push_subscriptions_org_idx
  on public.push_subscriptions(organization_id, active);

alter table public.push_subscriptions enable row level security;

-- Subscription management is performed only by authenticated server functions
-- using the Supabase service-role client. No direct browser access is granted.
revoke all on public.push_subscriptions from anon, authenticated;

comment on table public.push_subscriptions is 'Web Push subscriptions for TicketFlow operator/admin devices';
