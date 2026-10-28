-- TicketFlow XP rules v2. Archive the previous ledger, then rebuild active XP from eligible account activity.
begin;

alter table public.customer_xp_events add column if not exists source_key text;

create table if not exists public.customer_xp_events_archive
  (like public.customer_xp_events including defaults);
alter table public.customer_xp_events_archive
  add column if not exists archived_at timestamptz not null default now();

insert into public.customer_xp_events_archive
  (id, customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key)
select id, customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key
from public.customer_xp_events;

alter table public.customer_xp_events drop constraint if exists customer_xp_events_reason_check;
alter table public.customer_xp_events add constraint customer_xp_events_reason_check
  check (reason = any (array[
    'criar_conta','primeira_compra','compra_ingresso','comparecimento',
    'primeiro_comprador','compra_primeiro_dia','compra_adicional','compra_grupo','fidelidade'
  ]));
create unique index if not exists customer_xp_events_source_key_uidx
  on public.customer_xp_events(source_key) where source_key is not null;

create or replace function public.grant_xp_new_account()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_created_at timestamptz;
begin
  if new.user_id is null then return new; end if;
  select p.created_at into v_created_at from public.profiles p where p.id = new.user_id;
  if v_created_at is null then return new; end if;
  insert into public.customer_xp_events
    (customer_id, organization_id, amount, reason, metadata, created_at, source_key)
  values (new.id, new.organization_id, 50, 'criar_conta',
    jsonb_build_object('rule_version', 2), v_created_at, 'account:' || new.id::text)
  on conflict (source_key) where source_key is not null do nothing;
  return new;
end;
$$;

create or replace function public.grant_xp_on_sale_paid()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_signup_at timestamptz;
  v_first_batch_start timestamptz;
  v_is_first_purchase boolean;
  v_is_first_buyer boolean;
  v_is_repeat_event boolean;
begin
  if new.status <> 'pago' or old.status = 'pago'
     or new.customer_id is null or coalesce(new.is_courtesy, false) then
    return new;
  end if;

  select p.created_at into v_signup_at
  from public.customers c join public.profiles p on p.id = c.user_id
  where c.id = new.customer_id and c.organization_id = new.organization_id;
  if v_signup_at is null or new.created_at < v_signup_at then return new; end if;

  -- Serialize first-buyer decisions for this event.
  perform pg_advisory_xact_lock(hashtext(new.event_id::text));

  insert into public.customer_xp_events
    (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
  values
    (new.customer_id, new.organization_id, 200, 'compra_ingresso', new.event_id, new.id,
     jsonb_build_object('quantity', new.quantity, 'rule_version', 2), coalesce(new.paid_at, now()),
     'sale:' || new.id::text || ':purchase')
  on conflict (source_key) where source_key is not null do nothing;

  select not exists (
    select 1 from public.sales s
    where s.customer_id = new.customer_id and s.organization_id = new.organization_id
      and s.status = 'pago' and not coalesce(s.is_courtesy, false) and s.id <> new.id
      and s.created_at >= v_signup_at and s.created_at < new.created_at
  ) into v_is_first_purchase;

  if v_is_first_purchase then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
    values (new.customer_id, new.organization_id, 50, 'primeira_compra', new.event_id, new.id,
      jsonb_build_object('rule_version', 2), coalesce(new.paid_at, now()), 'sale:' || new.id::text || ':first-purchase')
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  select not exists (
    select 1 from public.sales s
    where s.event_id = new.event_id and s.organization_id = new.organization_id
      and s.status = 'pago' and not coalesce(s.is_courtesy, false) and s.id <> new.id
      and s.created_at >= v_signup_at
      and (coalesce(s.paid_at, s.updated_at, s.created_at), s.id) <
          (coalesce(new.paid_at, new.updated_at, new.created_at), new.id)
  ) into v_is_first_buyer;

  if v_is_first_buyer then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
    values (new.customer_id, new.organization_id, 100, 'primeiro_comprador', new.event_id, new.id,
      jsonb_build_object('rule_version', 2), coalesce(new.paid_at, now()), 'event:' || new.event_id::text || ':first-buyer')
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  select exists (
    select 1 from public.sales s
    where s.customer_id = new.customer_id and s.event_id = new.event_id
      and s.organization_id = new.organization_id and s.status = 'pago'
      and not coalesce(s.is_courtesy, false) and s.id <> new.id
      and s.created_at >= v_signup_at
  ) into v_is_repeat_event;

  if v_is_repeat_event then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
    values (new.customer_id, new.organization_id, 50, 'compra_adicional', new.event_id, new.id,
      jsonb_build_object('rule_version', 2), coalesce(new.paid_at, now()), 'sale:' || new.id::text || ':repeat-event')
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  if coalesce(new.quantity, 0) >= 3 then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
    values (new.customer_id, new.organization_id, 100, 'compra_grupo', new.event_id, new.id,
      jsonb_build_object('quantity', new.quantity, 'rule_version', 2), coalesce(new.paid_at, now()),
      'sale:' || new.id::text || ':group')
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  select min(tb.starts_at) into v_first_batch_start
  from public.ticket_batches tb where tb.event_id = new.event_id and tb.starts_at is not null;

  if v_first_batch_start is not null
     and (new.created_at at time zone 'America/Sao_Paulo')::date =
         (v_first_batch_start at time zone 'America/Sao_Paulo')::date then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
    values (new.customer_id, new.organization_id, 50, 'compra_primeiro_dia', new.event_id, new.id,
      jsonb_build_object('rule_version', 2), coalesce(new.paid_at, now()), 'sale:' || new.id::text || ':first-day')
    on conflict (source_key) where source_key is not null do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.grant_xp_on_checkin()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_customer_id uuid;
  v_org_id uuid;
  v_signup_at timestamptz;
  v_sale_created_at timestamptz;
begin
  if new.status <> 'utilizado' or old.status = 'utilizado' then return new; end if;

  select s.customer_id, s.organization_id, s.created_at, p.created_at
    into v_customer_id, v_org_id, v_sale_created_at, v_signup_at
  from public.sales s
  join public.customers c on c.id = s.customer_id
  join public.profiles p on p.id = c.user_id
  where s.id = new.sale_id and s.status = 'pago'
    and not coalesce(s.is_courtesy, false);

  if v_customer_id is null or v_signup_at is null
     or v_sale_created_at < v_signup_at
     or new.checked_in_at is null or new.checked_in_at < v_signup_at then
    return new;
  end if;

  insert into public.customer_xp_events
    (customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key)
  values (v_customer_id, v_org_id, 50, 'comparecimento', new.event_id, new.sale_id, new.id,
    jsonb_build_object('rule_version', 2), new.checked_in_at, 'ticket:' || new.id::text || ':checkin')
  on conflict (source_key) where source_key is not null do nothing;

  perform public.grant_xp_loyalty_if_eligible(v_customer_id);
  return new;
end;
$$;

create or replace function public.grant_xp_loyalty_if_eligible(_customer_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_org_id uuid;
  v_signup_at timestamptz;
  v_qualified boolean;
begin
  select c.organization_id, p.created_at into v_org_id, v_signup_at
  from public.customers c join public.profiles p on p.id = c.user_id
  where c.id = _customer_id;
  if v_org_id is null or v_signup_at is null then return; end if;

  with completed_events as (
    select e.id, e.event_date,
      row_number() over (order by e.event_date, e.id) as seq
    from public.events e
    where e.organization_id = v_org_id and (e.is_closed = true or e.event_date <= now())
  ),
  attended as (
    select distinct s.event_id
    from public.sales s
    join public.tickets t on t.sale_id = s.id and t.event_id = s.event_id
    where s.customer_id = _customer_id and s.organization_id = v_org_id
      and s.status = 'pago' and not coalesce(s.is_courtesy, false)
      and s.created_at >= v_signup_at
      and t.status = 'utilizado' and t.checked_in_at >= v_signup_at
  ),
  eligible as (
    select ce.id, ce.seq from completed_events ce join attended a on a.event_id = ce.id
  )
  select exists (
    select 1 from eligible a join eligible b on b.seq = a.seq + 1
      join eligible c on c.seq = b.seq + 1
  ) into v_qualified;

  if v_qualified then
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, metadata, created_at, source_key)
    values (_customer_id, v_org_id, 200, 'fidelidade',
      jsonb_build_object('rule_version', 2, 'criteria', '3 consecutive completed events with paid purchase and check-in'),
      now(), 'loyalty:' || _customer_id::text)
    on conflict (source_key) where source_key is not null do nothing;
  end if;
end;
$$;

revoke all on function public.grant_xp_loyalty_if_eligible(uuid) from public, anon, authenticated;

drop trigger if exists trg_grant_xp_new_account on public.customers;
create trigger trg_grant_xp_new_account
after insert or update of user_id on public.customers
for each row execute function public.grant_xp_new_account();

drop trigger if exists trg_grant_xp_on_sale_paid on public.sales;
create trigger trg_grant_xp_on_sale_paid
after update of status on public.sales
for each row execute function public.grant_xp_on_sale_paid();

drop trigger if exists trg_grant_xp_on_checkin on public.tickets;
create trigger trg_grant_xp_on_checkin
after update of status on public.tickets
for each row execute function public.grant_xp_on_checkin();

delete from public.customer_xp_events;

-- Signup bonus: only for customers connected to an actual account profile.
insert into public.customer_xp_events
  (customer_id, organization_id, amount, reason, metadata, created_at, source_key)
select c.id, c.organization_id, 50, 'criar_conta',
  jsonb_build_object('rule_version', 2), p.created_at, 'account:' || c.id::text
from public.customers c join public.profiles p on p.id = c.user_id
on conflict (source_key) where source_key is not null do nothing;

-- Eligible paid transactions and their additive bonuses.
with eligible_sales as (
  select s.*, p.created_at as signup_at,
    row_number() over (partition by s.customer_id, s.organization_id order by s.created_at, s.id) as customer_purchase_no,
    row_number() over (partition by s.event_id order by coalesce(s.paid_at, s.updated_at, s.created_at), s.id) as event_purchase_no,
    row_number() over (partition by s.customer_id, s.event_id order by s.created_at, s.id) as event_customer_purchase_no,
    (select min(tb.starts_at) from public.ticket_batches tb where tb.event_id = s.event_id and tb.starts_at is not null) as first_sales_at
  from public.sales s
  join public.customers c on c.id = s.customer_id and c.organization_id = s.organization_id
  join public.profiles p on p.id = c.user_id
  where s.status = 'pago' and not coalesce(s.is_courtesy, false)
    and s.created_at >= p.created_at
)
insert into public.customer_xp_events
  (customer_id, organization_id, amount, reason, event_id, sale_id, metadata, created_at, source_key)
select customer_id, organization_id, 200, 'compra_ingresso', event_id, id,
  jsonb_build_object('quantity', quantity, 'rule_version', 2), coalesce(paid_at, created_at), 'sale:' || id::text || ':purchase'
from eligible_sales
union all
select customer_id, organization_id, 50, 'primeira_compra', event_id, id,
  jsonb_build_object('rule_version', 2), coalesce(paid_at, created_at), 'sale:' || id::text || ':first-purchase'
from eligible_sales where customer_purchase_no = 1
union all
select customer_id, organization_id, 100, 'primeiro_comprador', event_id, id,
  jsonb_build_object('rule_version', 2), coalesce(paid_at, created_at), 'event:' || event_id::text || ':first-buyer'
from eligible_sales where event_purchase_no = 1
union all
select customer_id, organization_id, 50, 'compra_adicional', event_id, id,
  jsonb_build_object('rule_version', 2), coalesce(paid_at, created_at), 'sale:' || id::text || ':repeat-event'
from eligible_sales where event_customer_purchase_no > 1
union all
select customer_id, organization_id, 100, 'compra_grupo', event_id, id,
  jsonb_build_object('quantity', quantity, 'rule_version', 2), coalesce(paid_at, created_at), 'sale:' || id::text || ':group'
from eligible_sales where quantity >= 3
union all
select customer_id, organization_id, 50, 'compra_primeiro_dia', event_id, id,
  jsonb_build_object('rule_version', 2), coalesce(paid_at, created_at), 'sale:' || id::text || ':first-day'
from eligible_sales
where first_sales_at is not null
  and (created_at at time zone 'America/Sao_Paulo')::date =
      (first_sales_at at time zone 'America/Sao_Paulo')::date
on conflict (source_key) where source_key is not null do nothing;

-- Eligible check-ins only for purchases created after account registration.
insert into public.customer_xp_events
  (customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key)
select distinct s.customer_id, s.organization_id, 50, 'comparecimento', t.event_id, s.id, t.id,
  jsonb_build_object('rule_version', 2), t.checked_in_at, 'ticket:' || t.id::text || ':checkin'
from public.tickets t
join public.sales s on s.id = t.sale_id and s.event_id = t.event_id
join public.customers c on c.id = s.customer_id and c.organization_id = s.organization_id
join public.profiles p on p.id = c.user_id
where t.status = 'utilizado' and t.checked_in_at is not null
  and s.status = 'pago' and not coalesce(s.is_courtesy, false)
  and s.created_at >= p.created_at and t.checked_in_at >= p.created_at
on conflict (source_key) where source_key is not null do nothing;

-- Loyalty: three adjacent completed events in the organization's event sequence,
-- each with an eligible paid purchase and at least one valid check-in.
with completed_events as (
  select e.id, e.organization_id, e.event_date,
    row_number() over (partition by e.organization_id order by e.event_date, e.id) as seq
  from public.events e
  where e.is_closed = true or e.event_date <= now()
),
attended as (
  select distinct c.id as customer_id, s.organization_id, s.event_id
  from public.customers c
  join public.profiles p on p.id = c.user_id
  join public.sales s on s.customer_id = c.id and s.organization_id = c.organization_id
  join public.tickets t on t.sale_id = s.id and t.event_id = s.event_id
  where s.status = 'pago' and not coalesce(s.is_courtesy, false)
    and s.created_at >= p.created_at
    and t.status = 'utilizado' and t.checked_in_at >= p.created_at
),
eligible as (
  select a.customer_id, ce.organization_id, ce.id, ce.seq
  from attended a join completed_events ce on ce.id = a.event_id and ce.organization_id = a.organization_id
),
loyal as (
  select distinct a.customer_id, a.organization_id
  from eligible a join eligible b on b.customer_id = a.customer_id and b.organization_id = a.organization_id and b.seq = a.seq + 1
    join eligible c on c.customer_id = a.customer_id and c.organization_id = a.organization_id and c.seq = b.seq + 1
)
insert into public.customer_xp_events
  (customer_id, organization_id, amount, reason, metadata, created_at, source_key)
select l.customer_id, l.organization_id, 200, 'fidelidade',
  jsonb_build_object('rule_version', 2, 'criteria', '3 consecutive completed events with paid purchase and check-in'),
  now(), 'loyalty:' || l.customer_id::text
from loyal l
on conflict (source_key) where source_key is not null do nothing;

commit;