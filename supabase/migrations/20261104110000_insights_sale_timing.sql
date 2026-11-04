-- TicketFlow Insights: separar compras antecipadas e vendas no dia do evento (D0).
--
-- Mantém as RPCs antigas para compatibilidade. As novas sobrecargas recebem _timing:
--   advance  = D-N até D-1 (somente compras antecipadas)
--   event_day = D0 (data do evento, independente do dia da semana)
--   all      = todas as vendas válidas, incluindo D0 e pós-evento
--
-- No modo all, os retornos dos gráficos também separam os valores D0 para destaque visual.
-- O cálculo normalizado do gráfico por dia da semana dá o mesmo peso a cada evento com vendas.

create or replace function public.insights_sales_breakdown(
  _dimension text,
  _event_ids uuid[],
  _from date,
  _to date,
  _origin text,
  _count_saturday boolean,
  _lead_max integer,
  _timing text
)
returns table (
  bucket text,
  bucket_order integer,
  orders bigint,
  tickets bigint,
  revenue numeric,
  event_day_orders bigint,
  event_day_tickets bigint,
  event_day_revenue numeric,
  avg_orders_share numeric,
  avg_tickets_share numeric,
  avg_revenue_share numeric,
  avg_event_day_orders_share numeric,
  avg_event_day_tickets_share numeric,
  avg_event_day_revenue_share numeric
)
language plpgsql stable set search_path = public
as $fn$
begin
  if _dimension not in ('dow', 'hour_band', 'month_period', 'business_day_5', 'month_turn', 'lead_time') then
    raise exception 'Dimensão inválida: %', _dimension;
  end if;
  if _lead_max < 1 or _lead_max > 120 then
    raise exception 'Janela de antecedência inválida: %', _lead_max;
  end if;
  if _timing not in ('advance', 'event_day', 'all') then
    raise exception 'Tipo de análise inválido: %', _timing;
  end if;

  return query
  with facts as (
    select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)
  ),
  f as (
    select * from facts
    where _timing = 'all'
       or (_timing = 'advance' and lead_days > 0)
       or (_timing = 'event_day' and lead_days = 0)
  ),
  fifth as (
    select x.m, public.br_nth_business_day(extract(year from x.m)::integer, extract(month from x.m)::integer, 5, _count_saturday) as d5
    from (select distinct date_trunc('month', f.purchase_date)::date as m from f) x
  ),
  labels as (
    select v.b::text as bucket, v.o::integer as ord
    from (values ('Seg', 1), ('Ter', 2), ('Qua', 3), ('Qui', 4), ('Sex', 5), ('Sáb', 6), ('Dom', 7)) v(b, o)
    where _dimension = 'dow'
    union all
    select lpad((i * 4)::text, 2, '0') || '–' || lpad((i * 4 + 3)::text, 2, '0') || 'h', i
    from generate_series(0, 5) i where _dimension = 'hour_band'
    union all
    select v.b, v.o
    from (values ('1 a 5', 1), ('6 a 10', 2), ('11 a 15', 3), ('16 a 20', 4), ('21 a 25', 5), ('26 a 31', 6)) v(b, o)
    where _dimension = 'month_period'
    union all
    select v.b, v.o from (values ('Até o 5º dia útil', 1), ('Após o 5º dia útil', 2)) v(b, o)
    where _dimension = 'business_day_5'
    union all
    select v.b, v.o from (values ('Início do mês (primeiros 3 dias)', 1), ('Meio do mês', 2), ('Fim do mês (últimos 3 dias)', 3)) v(b, o)
    where _dimension = 'month_turn'
    union all
    select case when i = 0 then 'D0' else 'D-' || i end, _lead_max - i + 1
    from generate_series(0, _lead_max) i where _dimension = 'lead_time'
    union all select 'Antes de D-' || _lead_max, 0 where _dimension = 'lead_time'
    union all select 'Pós-evento', _lead_max + 2 where _dimension = 'lead_time'
  ),
  b as (
    select f.event_id, f.quantity, f.revenue, f.dow, f.lead_days,
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
  ),
  event_totals as (
    select event_id, count(*)::numeric as orders, sum(quantity)::numeric as tickets, sum(revenue)::numeric as revenue
    from f group by event_id
  ),
  event_dows as (
    select event_id, dow, count(*)::numeric as orders, sum(quantity)::numeric as tickets, sum(revenue)::numeric as revenue
    from f group by event_id, dow
  ),
  event_day_dows as (
    select event_id, dow, count(*)::numeric as orders, sum(quantity)::numeric as tickets, sum(revenue)::numeric as revenue
    from f where lead_days = 0 group by event_id, dow
  ),
  average_by_dow as (
    select g.dow,
      round(avg(coalesce(ed.orders, 0) / et.orders * 100), 2) as avg_orders_share,
      round(avg(coalesce(ed.tickets, 0) / et.tickets * 100), 2) as avg_tickets_share,
      round(avg(case when et.revenue <> 0 then coalesce(ed.revenue, 0) / et.revenue * 100 else 0 end), 2) as avg_revenue_share,
      round(avg(coalesce(evd.orders, 0) / et.orders * 100), 2) as avg_event_day_orders_share,
      round(avg(coalesce(evd.tickets, 0) / et.tickets * 100), 2) as avg_event_day_tickets_share,
      round(avg(case when et.revenue <> 0 then coalesce(evd.revenue, 0) / et.revenue * 100 else 0 end), 2) as avg_event_day_revenue_share
    from event_totals et
    cross join generate_series(1, 7) as g(dow)
    left join event_dows ed on ed.event_id = et.event_id and ed.dow = g.dow
    left join event_day_dows evd on evd.event_id = et.event_id and evd.dow = g.dow
    group by g.dow
  ),
  aggregated as (
    select b.bucket,
      count(*)::bigint as orders,
      coalesce(sum(b.quantity), 0)::bigint as tickets,
      coalesce(sum(b.revenue), 0)::numeric as revenue,
      count(*) filter (where b.lead_days = 0)::bigint as event_day_orders,
      coalesce(sum(b.quantity) filter (where b.lead_days = 0), 0)::bigint as event_day_tickets,
      coalesce(sum(b.revenue) filter (where b.lead_days = 0), 0)::numeric as event_day_revenue
    from b
    group by b.bucket
  )
  select l.bucket, l.ord,
    coalesce(a.orders, 0)::bigint,
    coalesce(a.tickets, 0)::bigint,
    coalesce(a.revenue, 0)::numeric,
    coalesce(a.event_day_orders, 0)::bigint,
    coalesce(a.event_day_tickets, 0)::bigint,
    coalesce(a.event_day_revenue, 0)::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_orders_share, 0) else 0 end::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_tickets_share, 0) else 0 end::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_revenue_share, 0) else 0 end::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_event_day_orders_share, 0) else 0 end::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_event_day_tickets_share, 0) else 0 end::numeric,
    case when _dimension = 'dow' then coalesce(av.avg_event_day_revenue_share, 0) else 0 end::numeric
  from labels l
  left join aggregated a on a.bucket = l.bucket
  left join average_by_dow av on _dimension = 'dow' and av.dow = l.ord
  order by l.ord;
end;
$fn$;

create or replace function public.insights_sales_daily(
  _event_ids uuid[],
  _from date,
  _to date,
  _origin text,
  _count_saturday boolean,
  _timing text
)
returns table (
  day date,
  orders bigint,
  tickets bigint,
  revenue numeric,
  cum_orders bigint,
  cum_tickets bigint,
  cum_revenue numeric,
  event_day_orders bigint,
  event_day_tickets bigint,
  event_day_revenue numeric,
  cum_event_day_orders bigint,
  cum_event_day_tickets bigint,
  cum_event_day_revenue numeric
)
language plpgsql stable set search_path = public
as $fn$
begin
  if _timing not in ('advance', 'event_day', 'all') then
    raise exception 'Tipo de análise inválido: %', _timing;
  end if;

  return query
  with facts as (
    select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)
  ),
  f as (
    select * from facts
    where _timing = 'all'
       or (_timing = 'advance' and lead_days > 0)
       or (_timing = 'event_day' and lead_days = 0)
  ),
  r as (select min(f.purchase_date) as a, max(f.purchase_date) as z from f),
  d as (select g::date as day from r, generate_series(r.a, r.z, interval '1 day') g where r.a is not null),
  agg as (
    select f.purchase_date as day,
      count(*) as o, sum(f.quantity) as t, sum(f.revenue) as v,
      count(*) filter (where f.lead_days = 0) as eo,
      coalesce(sum(f.quantity) filter (where f.lead_days = 0), 0) as et,
      coalesce(sum(f.revenue) filter (where f.lead_days = 0), 0) as ev
    from f group by f.purchase_date
  ),
  daily as (
    select d.day,
      coalesce(a.o, 0)::bigint as orders,
      coalesce(a.t, 0)::bigint as tickets,
      coalesce(a.v, 0)::numeric as revenue,
      coalesce(a.eo, 0)::bigint as event_day_orders,
      coalesce(a.et, 0)::bigint as event_day_tickets,
      coalesce(a.ev, 0)::numeric as event_day_revenue
    from d left join agg a on a.day = d.day
  )
  select daily.day, daily.orders, daily.tickets, daily.revenue,
    sum(daily.orders) over (order by daily.day)::bigint,
    sum(daily.tickets) over (order by daily.day)::bigint,
    sum(daily.revenue) over (order by daily.day)::numeric,
    daily.event_day_orders, daily.event_day_tickets, daily.event_day_revenue,
    sum(daily.event_day_orders) over (order by daily.day)::bigint,
    sum(daily.event_day_tickets) over (order by daily.day)::bigint,
    sum(daily.event_day_revenue) over (order by daily.day)::numeric
  from daily
  order by daily.day;
end;
$fn$;

create or replace function public.insights_sales_cross(
  _event_ids uuid[],
  _from date,
  _to date,
  _origin text,
  _count_saturday boolean,
  _timing text
)
returns table (
  lead_band text,
  lead_band_order integer,
  dow integer,
  dow_label text,
  month_period text,
  month_period_order integer,
  orders bigint,
  tickets bigint
)
language plpgsql stable set search_path = public
as $fn$
begin
  if _timing not in ('advance', 'event_day', 'all') then
    raise exception 'Tipo de análise inválido: %', _timing;
  end if;

  return query
  with facts as (
    select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)
  ),
  f as (
    select * from facts
    where _timing = 'all'
       or (_timing = 'advance' and lead_days > 0)
       or (_timing = 'event_day' and lead_days = 0)
  ),
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
  select c.lead_band, c.lead_band_order, c.dow,
    (array['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'])[c.dow],
    c.month_period, c.month_period_order, count(*)::bigint, sum(c.quantity)::bigint
  from c
  group by c.lead_band, c.lead_band_order, c.dow, c.month_period, c.month_period_order
  order by c.lead_band_order, c.dow, c.month_period_order;
end;
$fn$;

create or replace function public.insights_sales_summary(
  _event_ids uuid[],
  _from date,
  _to date,
  _origin text,
  _count_saturday boolean,
  _timing text
)
returns table (
  orders bigint,
  tickets bigint,
  revenue numeric,
  events_count bigint,
  first_date date,
  last_date date,
  orders_without_paid_at bigint,
  tests_excluded bigint,
  courtesies_excluded bigint,
  other_origin_excluded bigint
)
language plpgsql stable set search_path = public
as $fn$
begin
  if _timing not in ('advance', 'event_day', 'all') then
    raise exception 'Tipo de análise inválido: %', _timing;
  end if;

  return query
  with facts as (
    select * from public.insights_sales_facts(_event_ids, _from, _to, _origin, _count_saturday)
  ),
  f as (
    select * from facts
    where _timing = 'all'
       or (_timing = 'advance' and lead_days > 0)
       or (_timing = 'event_day' and lead_days = 0)
  ),
  x as (
    select s.is_test, s.is_courtesy, (s.origin = 'manual') as is_manual
    from public.sales s
    join public.events e on e.id = s.event_id
    cross join lateral (select coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo' as ts) l
    where s.status = 'pago'
      and (_event_ids is null or s.event_id = any (_event_ids))
      and (_from is null or l.ts::date >= _from)
      and (_to is null or l.ts::date <= _to)
      and (
        _timing = 'all'
        or (_timing = 'advance' and (e.event_date at time zone 'America/Sao_Paulo')::date > l.ts::date)
        or (_timing = 'event_day' and (e.event_date at time zone 'America/Sao_Paulo')::date = l.ts::date)
      )
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

-- As novas sobrecargas continuam SECURITY INVOKER (padrão) e acessíveis apenas a authenticated.
-- A autorização administrativa é aplicada pela função interna insights_sales_facts().
revoke all on function public.insights_sales_breakdown(text, uuid[], date, date, text, boolean, integer, text) from public, anon;
revoke all on function public.insights_sales_daily(uuid[], date, date, text, boolean, text) from public, anon;
revoke all on function public.insights_sales_cross(uuid[], date, date, text, boolean, text) from public, anon;
revoke all on function public.insights_sales_summary(uuid[], date, date, text, boolean, text) from public, anon;

grant execute on function public.insights_sales_breakdown(text, uuid[], date, date, text, boolean, integer, text) to authenticated;
grant execute on function public.insights_sales_daily(uuid[], date, date, text, boolean, text) to authenticated;
grant execute on function public.insights_sales_cross(uuid[], date, date, text, boolean, text) to authenticated;
grant execute on function public.insights_sales_summary(uuid[], date, date, text, boolean, text) to authenticated;
