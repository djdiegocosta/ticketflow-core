-- TicketFlow XP v3 — regras centralizadas, recálculo idempotente, segurança e fim das patentes.
--
-- O que muda em relação à v2 (migration 20261028161238):
--  1) UMA só lógica de pontos: `xp_expected_ledger()` calcula quanto cada cliente DEVE ter;
--     `rebuild_customer_xp()` compara com o ledger e acerta (insere o que falta, corrige o que
--     mudou, remove o que deixou de valer). Os gatilhos só chamam essa função. Recalcular tudo de
--     novo nunca duplica nada.
--  2) Vendas lançadas já como "pago" (ex.: venda manual) também geram XP (o gatilho antigo só
--     olhava UPDATE de status).
--  3) Venda paga que depois é cancelada/reembolsada perde o XP; o bônus de "primeiro comprador"
--     passa ao próximo comprador elegível.
--  4) "Primeiro dia de vendas" usa só lotes de venda (lote de cortesia não abre as vendas).
--  5) Fidelidade: +200 a cada bloco de 3 eventos concluídos e consecutivos (3º, 6º, 9º...), com
--     compra paga e check-in válido em cada um. Chave estável por evento => sem pagamento duplicado.
--  6) Segurança: qualquer cliente logado lia o XP de todos (a policy usava get_user_organization,
--     que sempre devolve a única organização). Agora: o próprio cliente OU admin/colaborador.
--     Escrita direta revogada de anon/authenticated.
--  7) Patentes removidas do banco (a view customer_xp_totals deixa de calcular "patente").
--  8) Falha no cálculo de XP nunca derruba um pagamento/check-in (vira WARNING).
--
-- Recuperação: o ledger v2 é copiado para `customer_xp_events_snapshot_v2` antes de tudo e o
-- histórico da v1 continua em `customer_xp_events_archive`.

-- 0) Snapshot do ledger ativo (v2) antes de reconstruir. Só cria uma vez.
create table if not exists public.customer_xp_events_snapshot_v2 as
  select x.*, now() as snapshot_at from public.customer_xp_events x;
alter table public.customer_xp_events_snapshot_v2 enable row level security;
revoke all on table public.customer_xp_events_snapshot_v2 from anon, authenticated;

-- 1) Valores oficiais (fonte única). Para mudar um valor, altere só aqui e rode rebuild_customer_xp().
create or replace function public.xp_rule_amount(_reason text)
returns integer language sql immutable parallel safe set search_path = public
as $fn$
  select case _reason
    when 'criar_conta'         then 50
    when 'primeira_compra'     then 50
    when 'compra_ingresso'     then 200
    when 'comparecimento'      then 50
    when 'primeiro_comprador'  then 100
    when 'compra_primeiro_dia' then 50
    when 'compra_adicional'    then 50
    when 'compra_grupo'        then 100
    when 'fidelidade'          then 200
  end
$fn$;

-- 2) Quanto cada cliente deve ter, calculado só a partir de vendas, check-ins, eventos e contas reais.
--    Elegível = cliente com conta (profiles); atividade só vale a partir da criação da conta.
--    Não altera nada: apenas lê.
create or replace function public.xp_expected_ledger(_customer_ids uuid[] default null)
returns table (
  customer_id uuid, organization_id uuid, reason text, amount integer,
  event_id uuid, sale_id uuid, ticket_id uuid, source_key text,
  occurred_at timestamptz, metadata jsonb
)
language sql stable set search_path = public
as $fn$
with accounts as (
  select c.id as customer_id, c.organization_id, p.created_at as signup_at
  from public.customers c
  join public.profiles p on p.id = c.user_id
),
-- Compras pagas válidas: status pago, não cortesia, feitas depois da criação da conta.
eligible_sales as (
  select s.id, s.customer_id, s.organization_id, s.event_id, s.quantity, s.created_at,
         coalesce(s.paid_at, s.created_at) as paid_time, a.signup_at
  from public.sales s
  join accounts a on a.customer_id = s.customer_id and a.organization_id = s.organization_id
  where s.status = 'pago' and not coalesce(s.is_courtesy, false) and s.created_at >= a.signup_at
),
ranked as (
  select es.*,
    row_number() over (partition by es.customer_id, es.organization_id order by es.paid_time, es.id) as n_customer,
    row_number() over (partition by es.event_id order by es.paid_time, es.id) as n_event,
    row_number() over (partition by es.customer_id, es.event_id order by es.paid_time, es.id) as n_customer_event
  from eligible_sales es
),
-- Abertura das vendas = menor data de início entre os lotes de VENDA do evento.
opening as (
  select tb.event_id, min(tb.starts_at) as opens_at
  from public.ticket_batches tb
  where not tb.is_courtesy and tb.starts_at is not null
  group by tb.event_id
),
-- Um check-in por cliente e evento (o mais antigo), de ingresso de compra elegível.
checkins as (
  select distinct on (es.customer_id, t.event_id)
         es.customer_id, es.organization_id, t.event_id, es.id as sale_id, t.id as ticket_id, t.checked_in_at
  from public.tickets t
  join eligible_sales es on es.id = t.sale_id and es.event_id = t.event_id
  where t.status = 'utilizado' and t.checked_in_at is not null and t.checked_in_at >= es.signup_at
  order by es.customer_id, t.event_id, t.checked_in_at, t.id
),
completed as (
  select e.id as event_id, e.organization_id,
         row_number() over (partition by e.organization_id order by e.event_date, e.id) as seq
  from public.events e
  where e.status = 'publicado' and e.event_date <= now()
),
attended as (
  select ck.customer_id, ck.organization_id, ck.event_id, ck.checked_in_at, co.seq
  from checkins ck
  join completed co on co.event_id = ck.event_id and co.organization_id = ck.organization_id
),
runs as (
  select a.*, a.seq - row_number() over (partition by a.customer_id, a.organization_id order by a.seq) as grp
  from attended a
),
loyalty as (
  select r.*, row_number() over (partition by r.customer_id, r.organization_id, r.grp order by r.seq) as pos_in_run
  from runs r
),
all_rows as (
  select a.customer_id, a.organization_id, 'criar_conta'::text as reason,
         public.xp_rule_amount('criar_conta') as amount,
         null::uuid as event_id, null::uuid as sale_id, null::uuid as ticket_id,
         'account:' || a.customer_id::text as source_key, a.signup_at as occurred_at,
         jsonb_build_object('rule_version', 3) as metadata
  from accounts a
  union all
  select r.customer_id, r.organization_id, 'compra_ingresso', public.xp_rule_amount('compra_ingresso'),
         r.event_id, r.id, null::uuid, 'sale:' || r.id::text || ':purchase', r.paid_time,
         jsonb_build_object('quantity', r.quantity, 'rule_version', 3)
  from ranked r
  union all
  select r.customer_id, r.organization_id, 'primeira_compra', public.xp_rule_amount('primeira_compra'),
         r.event_id, r.id, null::uuid, 'sale:' || r.id::text || ':first-purchase', r.paid_time,
         jsonb_build_object('rule_version', 3)
  from ranked r where r.n_customer = 1
  union all
  select r.customer_id, r.organization_id, 'primeiro_comprador', public.xp_rule_amount('primeiro_comprador'),
         r.event_id, r.id, null::uuid, 'event:' || r.event_id::text || ':first-buyer', r.paid_time,
         jsonb_build_object('rule_version', 3)
  from ranked r where r.n_event = 1
  union all
  select r.customer_id, r.organization_id, 'compra_adicional', public.xp_rule_amount('compra_adicional'),
         r.event_id, r.id, null::uuid, 'sale:' || r.id::text || ':repeat-event', r.paid_time,
         jsonb_build_object('rule_version', 3)
  from ranked r where r.n_customer_event > 1
  union all
  select r.customer_id, r.organization_id, 'compra_grupo', public.xp_rule_amount('compra_grupo'),
         r.event_id, r.id, null::uuid, 'sale:' || r.id::text || ':group', r.paid_time,
         jsonb_build_object('quantity', r.quantity, 'rule_version', 3)
  from ranked r where r.quantity >= 3
  union all
  select r.customer_id, r.organization_id, 'compra_primeiro_dia', public.xp_rule_amount('compra_primeiro_dia'),
         r.event_id, r.id, null::uuid, 'sale:' || r.id::text || ':first-day', r.paid_time,
         jsonb_build_object('rule_version', 3)
  from ranked r
  join opening o on o.event_id = r.event_id
  where r.created_at >= o.opens_at
    and (r.created_at at time zone 'America/Sao_Paulo')::date = (o.opens_at at time zone 'America/Sao_Paulo')::date
  union all
  select ck.customer_id, ck.organization_id, 'comparecimento', public.xp_rule_amount('comparecimento'),
         ck.event_id, ck.sale_id, ck.ticket_id, 'checkin:' || ck.customer_id::text || ':' || ck.event_id::text,
         ck.checked_in_at, jsonb_build_object('rule_version', 3)
  from checkins ck
  union all
  select l.customer_id, l.organization_id, 'fidelidade', public.xp_rule_amount('fidelidade'),
         l.event_id, null::uuid, null::uuid, 'loyalty:' || l.customer_id::text || ':' || l.event_id::text,
         l.checked_in_at,
         jsonb_build_object('rule_version', 3, 'criteria', '3 eventos consecutivos concluidos com compra paga e check-in')
  from loyalty l where l.pos_in_run % 3 = 0
)
select ar.customer_id, ar.organization_id, ar.reason, ar.amount, ar.event_id, ar.sale_id, ar.ticket_id,
       ar.source_key, ar.occurred_at, ar.metadata
from all_rows ar
where _customer_ids is null or ar.customer_id = any(_customer_ids)
$fn$;

-- 3) Acerta o ledger com o esperado. Idempotente: rodar de novo não muda nada.
--    Só mexe nas linhas de pontos GANHOS (os 9 motivos oficiais); linhas futuras de resgate ficam intactas.
create or replace function public.rebuild_customer_xp()
returns table (inserted integer, updated integer, deleted integer)
language plpgsql set search_path = public
as $fn$
declare
  v_earned text[] := array['criar_conta','primeira_compra','compra_ingresso','comparecimento',
                           'primeiro_comprador','compra_primeiro_dia','compra_adicional','compra_grupo','fidelidade'];
begin
  -- Uma reconstrução por vez (evita dois processos decidindo o "primeiro comprador" ao mesmo tempo).
  perform pg_advisory_xact_lock(hashtext('ticketflow-xp-ledger'));

  with upserted as (
    insert into public.customer_xp_events
      (customer_id, organization_id, amount, reason, event_id, sale_id, ticket_id, metadata, created_at, source_key)
    select e.customer_id, e.organization_id, e.amount, e.reason, e.event_id, e.sale_id, e.ticket_id,
           e.metadata, e.occurred_at, e.source_key
    from public.xp_expected_ledger() e
    on conflict (source_key) where source_key is not null
    do update set customer_id = excluded.customer_id, organization_id = excluded.organization_id,
                  amount = excluded.amount, reason = excluded.reason, event_id = excluded.event_id,
                  sale_id = excluded.sale_id, ticket_id = excluded.ticket_id,
                  metadata = excluded.metadata, created_at = excluded.created_at
    where (customer_xp_events.customer_id, customer_xp_events.amount, customer_xp_events.reason,
           customer_xp_events.event_id, customer_xp_events.sale_id, customer_xp_events.ticket_id,
           customer_xp_events.created_at)
          is distinct from
          (excluded.customer_id, excluded.amount, excluded.reason,
           excluded.event_id, excluded.sale_id, excluded.ticket_id, excluded.created_at)
    returning (xmax = 0) as was_insert
  )
  select count(*) filter (where was_insert)::integer, count(*) filter (where not was_insert)::integer
    into inserted, updated from upserted;

  with removed as (
    delete from public.customer_xp_events x
    where x.reason = any (v_earned)
      and (x.source_key is null
           or not exists (select 1 from public.xp_expected_ledger() e where e.source_key = x.source_key))
    returning 1
  )
  select count(*)::integer into deleted from removed;

  return next;
end;
$fn$;

revoke all on function public.rebuild_customer_xp() from public, anon, authenticated;
grant execute on function public.rebuild_customer_xp() to service_role;
revoke all on function public.xp_expected_ledger(uuid[]) from public, anon, authenticated;
grant execute on function public.xp_expected_ledger(uuid[]) to service_role;

-- 4) Gatilhos: qualquer mudança que possa afetar pontos manda reconstruir. O SECURITY DEFINER é
--    necessário porque quem dispara (operador de check-in, painel, webhook) não tem permissão de
--    escrita no ledger. search_path fixo; sem EXECUTE para anon/authenticated.
create or replace function public.trg_xp_resync()
returns trigger language plpgsql security definer set search_path = public
as $fn$
begin
  begin
    perform public.rebuild_customer_xp();
  exception when others then
    -- Pontos nunca podem impedir um pagamento ou um check-in. Rode rebuild_customer_xp() depois.
    raise warning 'XP: falha ao reconstruir pontos (%): %', sqlstate, sqlerrm;
  end;
  return null;
end;
$fn$;
revoke all on function public.trg_xp_resync() from public, anon, authenticated;

drop trigger if exists trg_grant_xp_new_account on public.customers;
drop trigger if exists trg_grant_xp_on_sale_paid on public.sales;
drop trigger if exists trg_grant_xp_on_checkin on public.tickets;
drop function if exists public.grant_xp_new_account();
drop function if exists public.grant_xp_on_sale_paid();
drop function if exists public.grant_xp_on_checkin();
drop function if exists public.grant_xp_loyalty_if_eligible(uuid);

create trigger trg_xp_resync_account
  after insert or update of user_id on public.customers
  for each row when (new.user_id is not null) execute function public.trg_xp_resync();
create trigger trg_xp_resync_sale_insert
  after insert on public.sales
  for each row when (new.status = 'pago') execute function public.trg_xp_resync();
create trigger trg_xp_resync_sale_update
  after update of status, customer_id, is_courtesy, quantity, paid_at on public.sales
  for each row when (old.status = 'pago' or new.status = 'pago') execute function public.trg_xp_resync();
create trigger trg_xp_resync_checkin
  after update of status, checked_in_at on public.tickets
  for each row when (old.status = 'utilizado' or new.status = 'utilizado') execute function public.trg_xp_resync();
create trigger trg_xp_resync_event
  after update of event_date, status on public.events
  for each row execute function public.trg_xp_resync();

-- 5) Segurança: leitura só do próprio cliente ou de admin/colaborador; sem escrita direta.
drop policy if exists "Admins or own customer can read xp events" on public.customer_xp_events;
drop policy if exists "Staff or own customer can read xp events" on public.customer_xp_events;
create policy "Staff or own customer can read xp events" on public.customer_xp_events
  for select to authenticated
  using (
    customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
    or (
      organization_id = public.get_user_organization((select auth.uid()))
      and (public.has_role((select auth.uid()), 'admin') or public.has_role((select auth.uid()), 'colaborador'))
    )
  );
revoke all on table public.customer_xp_events from anon, authenticated;
grant select on table public.customer_xp_events to authenticated;

-- 6) Totais sem patentes. A view continua respeitando o RLS de quem consulta.
drop view if exists public.customer_xp_totals;
create view public.customer_xp_totals with (security_invoker = true) as
  select customer_id, organization_id, sum(amount)::integer as total_xp
  from public.customer_xp_events
  group by customer_id, organization_id;
revoke all on table public.customer_xp_totals from anon, authenticated;
grant select on table public.customer_xp_totals to authenticated;

comment on function public.xp_expected_ledger(uuid[]) is 'Regras oficiais de XP (fonte única). Só leitura.';
comment on function public.rebuild_customer_xp() is 'Acerta customer_xp_events com xp_expected_ledger(). Idempotente.';

-- 7) Reconstrução inicial (idempotente).
select * from public.rebuild_customer_xp();
