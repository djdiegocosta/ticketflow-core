-- TicketFlow Insights — Etapas 3+4: fundação de dados dos indicadores de vendas (1 a 8).
--
-- Regras (decisões do dono, docs/INSIGHTS-PLANEJAMENTO.md):
--  * Vendas contadas: status 'pago', não cortesia, não teste. Tudo em horário de Brasília.
--  * Data da compra = paid_at quando existir, senão created_at.
--  * Origem: 'online' (padrão), 'manual' (bilheteria) ou 'all'.
--  * Receita = total_amount menos refunded_amount (reembolso parcial).
--  * 5º dia útil: conta sábado por padrão (parâmetro _count_saturday); domingo e feriados nacionais não contam.
--  * Virada do mês: últimos 3 e primeiros 3 dias do mês.
--  * Antecedência (D-n) por data de calendário: evento 20/12 e compra 20/12 = D0, mesmo depois do horário do evento.
-- Todas as funções são SECURITY INVOKER e exigem papel admin (erro "Sem permissão" para os demais).

-- 1) Calendário de feriados nacionais (2026-2030). Carnaval e Corpus Christi são pontos facultativos: fora.
--    Para feriado estadual/municipal, basta inserir uma linha (scope = 'municipal').
create table if not exists public.br_holidays (
  holiday_date date primary key,
  name text not null,
  scope text not null default 'nacional'
);
alter table public.br_holidays enable row level security;
drop policy if exists "Feriados são públicos para quem está logado" on public.br_holidays;
create policy "Feriados são públicos para quem está logado" on public.br_holidays
  for select to authenticated using (true);
revoke all on table public.br_holidays from anon, authenticated;
grant select on table public.br_holidays to authenticated;

insert into public.br_holidays (holiday_date, name)
select make_date(y, m, d), n
from generate_series(2026, 2030) y,
     (values (1, 1, 'Confraternização Universal'), (4, 21, 'Tiradentes'), (5, 1, 'Dia do Trabalho'),
             (9, 7, 'Independência'), (10, 12, 'Nossa Senhora Aparecida'), (11, 2, 'Finados'),
             (11, 15, 'Proclamação da República'), (11, 20, 'Consciência Negra'), (12, 25, 'Natal')) f(m, d, n)
on conflict (holiday_date) do nothing;

insert into public.br_holidays (holiday_date, name) values
  ('2026-04-03', 'Sexta-feira Santa'), ('2027-03-26', 'Sexta-feira Santa'), ('2028-04-14', 'Sexta-feira Santa'),
  ('2029-03-30', 'Sexta-feira Santa'), ('2030-04-19', 'Sexta-feira Santa')
on conflict (holiday_date) do nothing;

create or replace function public.br_is_business_day(_d date, _count_saturday boolean default true)
returns boolean language sql stable set search_path = public
as $fn$
  select extract(isodow from _d) <> 7
     and (_count_saturday or extract(isodow from _d) <> 6)
     and not exists (select 1 from public.br_holidays h where h.holiday_date = _d);
$fn$;

create or replace function public.br_nth_business_day(_year integer, _month integer, _n integer, _count_saturday boolean default true)
returns date language sql stable set search_path = public
as $fn$
  select t.d from (
    select g::date as d, row_number() over (order by g) as rn
    from generate_series(make_date(_year, _month, 1), (make_date(_year, _month, 1) + interval '1 month - 1 day')::date, interval '1 day') g
    where public.br_is_business_day(g::date, _count_saturday)
  ) t where t.rn = _n;
$fn$;

-- 2) Índices por data (o volume ainda é pequeno, mas as consultas do Insights filtram por evento e data).
create index if not exists sales_paid_event_created_idx on public.sales (event_id, created_at) where status = 'pago';
create index if not exists sales_paid_created_idx on public.sales (created_at) where status = 'pago';

-- 3) Uma linha por venda válida, com todas as dimensões já calculadas (sem dado pessoal).
create or replace function public.insights_sales_facts(
  _event_ids uuid[] default null, _from date default null, _to date default null,
  _origin text default 'online', _count_saturday boolean default true
)
returns table (
  sale_id uuid, event_id uuid, origin_group text, quantity integer, revenue numeric,
  purchase_ts timestamptz, purchase_date date, dow integer, hour integer, dom integer,
  days_in_month integer, lead_days integer, paid_at_known boolean
)
language plpgsql stable set search_path = public
as $fn$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  if _origin not in ('online', 'manual', 'all') then
    raise exception 'Origem inválida: %', _origin;
  end if;
  return query
  select s.id, s.event_id,
         (case when s.origin = 'manual' then 'manual' else 'online' end)::text,
         s.quantity, (s.total_amount - coalesce(s.refunded_amount, 0))::numeric,
         coalesce(s.paid_at, s.created_at),
         l.ts::date,
         extract(isodow from l.ts)::integer,
         extract(hour from l.ts)::integer,
         extract(day from l.ts)::integer,
         extract(day from (date_trunc('month', l.ts) + interval '1 month - 1 day'))::integer,
         ((e.event_date at time zone 'America/Sao_Paulo')::date - l.ts::date)::integer,
         s.paid_at is not null
  from public.sales s
  join public.events e on e.id = s.event_id
  cross join lateral (select (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo') as ts) l
  where s.status = 'pago' and not s.is_courtesy and not s.is_test
    and (_event_ids is null or s.event_id = any (_event_ids))
    and (_origin = 'all' or (_origin = 'manual' and s.origin = 'manual') or (_origin = 'online' and s.origin <> 'manual'))
    and (_from is null or l.ts::date >= _from)
    and (_to is null or l.ts::date <= _to);
end;
$fn$;

-- 4) Vendas por dimensão (indicadores 1, 2, 3, 4, 5 e 6). Baldes fixos, com zeros preenchidos e ordem estável.
create or replace function public.insights_sales_breakdown(
  _dimension text, _event_ids uuid[] default null, _from date default null, _to date default null,
  _origin text default 'online', _count_saturday boolean default true, _lead_max integer default 20
)
returns table (bucket text, bucket_order integer, orders bigint, tickets bigint, revenue numeric)
language plpgsql stable set search_path = public
as $fn$
begin
  if _dimension not in ('dow', 'hour_band', 'month_period', 'business_day_5', 'month_turn', 'lead_time') then
    raise exception 'Dimensão inválida: %', _dimension;
  end if;
  if _lead_max < 1 or _lead_max > 120 then
    raise exception 'Janela de antecedência inválida: %', _lead_max;
  end if;
  return query
  with f as (select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)),
  fifth as (
    select x.m, public.br_nth_business_day(extract(year from x.m)::integer, extract(month from x.m)::integer, 5, _count_saturday) as d5
    from (select distinct date_trunc('month', f.purchase_date)::date as m from f) x
  ),
  labels as (
    select v.b::text as bucket, v.o::integer as ord
    from (values ('Seg', 1), ('Ter', 2), ('Qua', 3), ('Qui', 4), ('Sex', 5), ('Sáb', 6), ('Dom', 7)) v(b, o) where _dimension = 'dow'
    union all
    select lpad((i * 4)::text, 2, '0') || '–' || lpad((i * 4 + 3)::text, 2, '0') || 'h', i
    from generate_series(0, 5) i where _dimension = 'hour_band'
    union all
    select v.b, v.o from (values ('1 a 5', 1), ('6 a 10', 2), ('11 a 15', 3), ('16 a 20', 4), ('21 a 25', 5), ('26 a 31', 6)) v(b, o) where _dimension = 'month_period'
    union all
    select v.b, v.o from (values ('Até o 5º dia útil', 1), ('Após o 5º dia útil', 2)) v(b, o) where _dimension = 'business_day_5'
    union all
    select v.b, v.o from (values ('Início do mês (primeiros 3 dias)', 1), ('Meio do mês', 2), ('Fim do mês (últimos 3 dias)', 3)) v(b, o) where _dimension = 'month_turn'
    union all
    select case when i = 0 then 'D0' else 'D-' || i end, _lead_max - i + 1
    from generate_series(0, _lead_max) i where _dimension = 'lead_time'
    union all select 'Antes de D-' || _lead_max, 0 where _dimension = 'lead_time'
    union all select 'Pós-evento', _lead_max + 2 where _dimension = 'lead_time'
  ),
  b as (
    select f.quantity, f.revenue,
      case _dimension
        when 'dow' then (array['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])[f.dow]
        when 'hour_band' then lpad((f.hour / 4 * 4)::text, 2, '0') || '–' || lpad((f.hour / 4 * 4 + 3)::text, 2, '0') || 'h'
        when 'month_period' then case when f.dom <= 5 then '1 a 5' when f.dom <= 10 then '6 a 10' when f.dom <= 15 then '11 a 15'
                                      when f.dom <= 20 then '16 a 20' when f.dom <= 25 then '21 a 25' else '26 a 31' end
        when 'business_day_5' then case when f.purchase_date <= fi.d5 then 'Até o 5º dia útil' else 'Após o 5º dia útil' end
        when 'month_turn' then case when f.dom >= f.days_in_month - 2 then 'Fim do mês (últimos 3 dias)'
                                    when f.dom <= 3 then 'Início do mês (primeiros 3 dias)' else 'Meio do mês' end
        when 'lead_time' then case when f.lead_days < 0 then 'Pós-evento' when f.lead_days > _lead_max then 'Antes de D-' || _lead_max
                                   when f.lead_days = 0 then 'D0' else 'D-' || f.lead_days end
      end as bucket
    from f left join fifth fi on fi.m = date_trunc('month', f.purchase_date)::date
  )
  select l.bucket, l.ord, count(b.bucket)::bigint, coalesce(sum(b.quantity), 0)::bigint, coalesce(sum(b.revenue), 0)::numeric
  from labels l left join b on b.bucket = l.bucket
  group by l.bucket, l.ord
  order by l.ord;
end;
$fn$;

-- 5) Evolução diária (indicador 7): todos os dias entre a primeira e a última venda, com zeros e acumulado.
create or replace function public.insights_sales_daily(
  _event_ids uuid[] default null, _from date default null, _to date default null,
  _origin text default 'online', _count_saturday boolean default true
)
returns table (day date, orders bigint, tickets bigint, revenue numeric, cum_orders bigint, cum_tickets bigint, cum_revenue numeric)
language plpgsql stable set search_path = public
as $fn$
begin
  return query
  with f as (select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)),
  r as (select min(f.purchase_date) as a, max(f.purchase_date) as z from f),
  d as (select g::date as day from r, generate_series(r.a, r.z, interval '1 day') g where r.a is not null),
  agg as (select f.purchase_date as day, count(*) as o, sum(f.quantity) as t, sum(f.revenue) as v from f group by f.purchase_date)
  select d.day, coalesce(a.o, 0)::bigint, coalesce(a.t, 0)::bigint, coalesce(a.v, 0)::numeric,
         sum(coalesce(a.o, 0)) over (order by d.day)::bigint,
         sum(coalesce(a.t, 0)) over (order by d.day)::bigint,
         sum(coalesce(a.v, 0)) over (order by d.day)::numeric
  from d left join agg a on a.day = d.day
  order by d.day;
end;
$fn$;

-- 6) Cruzamento antecedência x dia da semana x período do mês (indicador 8). Só células com venda.
create or replace function public.insights_sales_cross(
  _event_ids uuid[] default null, _from date default null, _to date default null,
  _origin text default 'online', _count_saturday boolean default true
)
returns table (lead_band text, lead_band_order integer, dow integer, dow_label text, month_period text, month_period_order integer, orders bigint, tickets bigint)
language plpgsql stable set search_path = public
as $fn$
begin
  return query
  with f as (select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)),
  c as (
    select f.quantity, f.dow,
      case when f.lead_days < 0 or f.lead_days > 20 then 'Fora da janela' when f.lead_days = 0 then 'D0'
           when f.lead_days <= 3 then 'D-3 a D-1' when f.lead_days <= 7 then 'D-7 a D-4'
           when f.lead_days <= 14 then 'D-14 a D-8' else 'D-20 a D-15' end as lead_band,
      case when f.lead_days < 0 or f.lead_days > 20 then 0 when f.lead_days = 0 then 5
           when f.lead_days <= 3 then 4 when f.lead_days <= 7 then 3 when f.lead_days <= 14 then 2 else 1 end as lead_band_order,
      case when f.dom <= 5 then '1 a 5' when f.dom <= 10 then '6 a 10' when f.dom <= 15 then '11 a 15'
           when f.dom <= 20 then '16 a 20' when f.dom <= 25 then '21 a 25' else '26 a 31' end as month_period,
      case when f.dom <= 5 then 1 when f.dom <= 10 then 2 when f.dom <= 15 then 3
           when f.dom <= 20 then 4 when f.dom <= 25 then 5 else 6 end as month_period_order
    from f
  )
  select c.lead_band, c.lead_band_order, c.dow, (array['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])[c.dow],
         c.month_period, c.month_period_order, count(*)::bigint, sum(c.quantity)::bigint
  from c
  group by c.lead_band, c.lead_band_order, c.dow, c.month_period, c.month_period_order
  order by c.lead_band_order, c.dow, c.month_period_order;
end;
$fn$;

-- 7) Resumo e transparência: o que entrou e o que ficou de fora do filtro.
create or replace function public.insights_sales_summary(
  _event_ids uuid[] default null, _from date default null, _to date default null,
  _origin text default 'online', _count_saturday boolean default true
)
returns table (
  orders bigint, tickets bigint, revenue numeric, events_count bigint, first_date date, last_date date,
  orders_without_paid_at bigint, tests_excluded bigint, courtesies_excluded bigint, other_origin_excluded bigint
)
language plpgsql stable set search_path = public
as $fn$
begin
  return query
  with f as (select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)),
  x as (
    select s.is_test, s.is_courtesy, (s.origin = 'manual') as is_manual
    from public.sales s
    cross join lateral (select (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date as d) l
    where s.status = 'pago'
      and (_event_ids is null or s.event_id = any (_event_ids))
      and (_from is null or l.d >= _from) and (_to is null or l.d <= _to)
  )
  select (select count(*) from f)::bigint,
         (select coalesce(sum(f.quantity), 0) from f)::bigint,
         (select coalesce(sum(f.revenue), 0) from f)::numeric,
         (select count(distinct f.event_id) from f)::bigint,
         (select min(f.purchase_date) from f),
         (select max(f.purchase_date) from f),
         (select count(*) from f where not f.paid_at_known)::bigint,
         (select count(*) from x where x.is_test)::bigint,
         (select count(*) from x where x.is_courtesy and not x.is_test)::bigint,
         (select count(*) from x where not x.is_test and not x.is_courtesy
            and ((_origin = 'online' and x.is_manual) or (_origin = 'manual' and not x.is_manual)))::bigint;
end;
$fn$;

revoke all on function public.br_is_business_day(date, boolean) from public, anon;
revoke all on function public.br_nth_business_day(integer, integer, integer, boolean) from public, anon;
revoke all on function public.insights_sales_facts(uuid[], date, date, text, boolean) from public, anon;
revoke all on function public.insights_sales_breakdown(text, uuid[], date, date, text, boolean, integer) from public, anon;
revoke all on function public.insights_sales_daily(uuid[], date, date, text, boolean) from public, anon;
revoke all on function public.insights_sales_cross(uuid[], date, date, text, boolean) from public, anon;
revoke all on function public.insights_sales_summary(uuid[], date, date, text, boolean) from public, anon;
grant execute on function public.br_is_business_day(date, boolean) to authenticated, service_role;
grant execute on function public.br_nth_business_day(integer, integer, integer, boolean) to authenticated, service_role;
grant execute on function public.insights_sales_facts(uuid[], date, date, text, boolean) to authenticated;
grant execute on function public.insights_sales_breakdown(text, uuid[], date, date, text, boolean, integer) to authenticated;
grant execute on function public.insights_sales_daily(uuid[], date, date, text, boolean) to authenticated;
grant execute on function public.insights_sales_cross(uuid[], date, date, text, boolean) to authenticated;
grant execute on function public.insights_sales_summary(uuid[], date, date, text, boolean) to authenticated;
