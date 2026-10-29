-- XP: cliente com login (auth.users) mas sem linha em profiles passa a ter a data de cadastro
-- tirada de auth.users.created_at (em todos os outros clientes as duas datas coincidem).
-- Só troca a função de cálculo; o restante da v3 continua igual. Depois reconstrói o ledger (idempotente).
create or replace function public.xp_expected_ledger(_customer_ids uuid[] default null)
returns table (
  customer_id uuid, organization_id uuid, reason text, amount integer,
  event_id uuid, sale_id uuid, ticket_id uuid, source_key text,
  occurred_at timestamptz, metadata jsonb
)
language sql stable set search_path = public
as $fn$
with accounts as (
  -- Data de cadastro: profiles.created_at; se o perfil faltar, a data de criação do login (auth.users).
  select c.id as customer_id, c.organization_id, coalesce(p.created_at, u.created_at) as signup_at
  from public.customers c
  join auth.users u on u.id = c.user_id
  left join public.profiles p on p.id = c.user_id
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

-- A função agora lê auth.users, que o papel service_role (chave da API) não pode ler. Para não deixar
-- uma função exposta que só falharia, ela passa a ser executada apenas pelo dono (editor SQL do
-- Supabase, como "postgres") e pelos gatilhos (SECURITY DEFINER). Nenhum papel da API a executa.
revoke all on function public.xp_expected_ledger(uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.rebuild_customer_xp() from public, anon, authenticated, service_role;

select * from public.rebuild_customer_xp();
