-- DESFAZER a migration 20261028230000_xp_rules_v3_single_ledger.sql (só se ela já foi aplicada).
-- Volta ao estado da v2 (migration 20261028161238): gatilhos grant_xp_*, policy antiga, view com patente
-- e o ledger exatamente como estava antes da v3 (copiado de customer_xp_events_snapshot_v2).
-- ATENÇÃO: a policy antiga deixa qualquer cliente logado ler o XP de todos. Use só em emergência.

-- 1) Gatilhos e funções da v3
drop trigger if exists trg_xp_resync_account on public.customers;
drop trigger if exists trg_xp_resync_sale_insert on public.sales;
drop trigger if exists trg_xp_resync_sale_update on public.sales;
drop trigger if exists trg_xp_resync_checkin on public.tickets;
drop trigger if exists trg_xp_resync_event on public.events;
drop function if exists public.trg_xp_resync();
drop function if exists public.rebuild_customer_xp();
drop function if exists public.xp_expected_ledger(uuid[]);
drop function if exists public.xp_rule_amount(text);

-- 2) Ledger como estava na v2
delete from public.customer_xp_events;
insert into public.customer_xp_events
  (id, customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key)
select id, customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key
from public.customer_xp_events_snapshot_v2;

-- 3) View, policy e privilégios da v2
drop view if exists public.customer_xp_totals;
create view public.customer_xp_totals with (security_invoker = true) as
  select customer_id, organization_id, sum(amount)::integer as total_xp,
    case when sum(amount) >= 7500 then 'Lenda' when sum(amount) >= 3500 then 'Elite'
         when sum(amount) >= 1500 then 'VIP' when sum(amount) >= 500 then 'Frequente' else 'Novato' end as patente
  from public.customer_xp_events group by customer_id, organization_id;
grant all on table public.customer_xp_totals to anon, authenticated;

drop policy if exists "Staff or own customer can read xp events" on public.customer_xp_events;
create policy "Admins or own customer can read xp events" on public.customer_xp_events for select to authenticated
  using ((organization_id = get_user_organization((select auth.uid())))
         or (customer_id in (select customers.id from customers where customers.user_id = (select auth.uid()))));
grant all on table public.customer_xp_events to anon, authenticated;

-- 4) Funções e gatilhos da v2: recrie executando, nesta ordem, os blocos "create or replace function
--    public.grant_xp_new_account / grant_xp_on_sale_paid / grant_xp_on_checkin / grant_xp_loyalty_if_eligible"
--    e "create trigger trg_grant_xp_*" do arquivo supabase/migrations/20261028161238_refactor_customer_xp_rules_v2.sql.
