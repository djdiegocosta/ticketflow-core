-- Testes das novas RPCs de separação entre vendas antecipadas e D0.
-- Execute depois de aplicar 20261104110000_insights_sale_timing.sql.
-- Termina com RAISE EXCEPTION de propósito para desfazer todos os dados criados.

create function pg_temp.t_insights_d0_sale(
  _event uuid,
  _batch uuid,
  _created timestamptz
)
returns uuid
language plpgsql
as $fn$
declare v uuid;
begin
  insert into public.sales (
    organization_id, event_id, batch_id, sale_code, buyer_name,
    quantity, unit_price, total_amount, created_at, status, origin, is_courtesy, is_test
  )
  values (
    (select organization_id from public.events where id = _event),
    _event, _batch, 'D0' || upper(substr(gen_random_uuid()::text, 1, 8)),
    'Teste Insights D0', 1, 30, 30, _created, 'pago', 'ticketflow', false, false
  )
  returning id into v;
  return v;
end;
$fn$;

do $test$
declare
  results text[] := '{}';
  org uuid;
  e1 uuid;
  e2 uuid;
  b1 uuid;
  b2 uuid;
  ids uuid[];
  admin_id uuid := gen_random_uuid();
  advance_orders bigint;
  event_day_orders bigint;
  all_orders bigint;
  d0_orders bigint;
  d0_daily bigint;
  daily_orders bigint;
  d0_breakdown bigint;
  total_breakdown bigint;
  average_total numeric;
  error_message text;
begin
  select id into org from public.organizations limit 1;

  insert into public.events (organization_id, title, event_date, location, slug, status)
  values (org, 'TESTE INSIGHTS D0 SÁBADO', '2026-12-19 23:00:00+00', 'x', 'teste-insights-d0-sab-' || substr(gen_random_uuid()::text, 1, 8), 'publicado')
  returning id into e1;

  insert into public.events (organization_id, title, event_date, location, slug, status)
  values (org, 'TESTE INSIGHTS D0 QUARTA', '2026-12-23 23:00:00+00', 'x', 'teste-insights-d0-qua-' || substr(gen_random_uuid()::text, 1, 8), 'publicado')
  returning id into e2;

  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy)
  values (org, e1, 'Lote teste D0', 30, 100, '2026-12-01 12:00:00+00', false)
  returning id into b1;

  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy)
  values (org, e2, 'Lote teste D0', 30, 100, '2026-12-01 12:00:00+00', false)
  returning id into b2;

  -- Em cada evento: uma compra D-1, uma compra D0 e uma compra pós-evento.
  perform pg_temp.t_insights_d0_sale(e1, b1, '2026-12-18 15:00:00+00');
  perform pg_temp.t_insights_d0_sale(e1, b1, '2026-12-19 15:00:00+00');
  perform pg_temp.t_insights_d0_sale(e1, b1, '2026-12-20 15:00:00+00');
  perform pg_temp.t_insights_d0_sale(e2, b2, '2026-12-22 15:00:00+00');
  perform pg_temp.t_insights_d0_sale(e2, b2, '2026-12-23 15:00:00+00');
  perform pg_temp.t_insights_d0_sale(e2, b2, '2026-12-24 15:00:00+00');

  ids := array[e1, e2];

  insert into auth.users (id, aud, role, email, created_at, updated_at)
  values (admin_id, 'authenticated', 'authenticated', 'insights-d0-' || substr(gen_random_uuid()::text, 1, 8) || '@test.local', now(), now());
  insert into public.user_roles (user_id, organization_id, role)
  values (admin_id, org, 'admin');

  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select orders into advance_orders
  from public.insights_sales_summary(ids, null, null, 'online', true, 'advance', 20);

  select orders into event_day_orders
  from public.insights_sales_summary(ids, null, null, 'online', true, 'event_day', 20);

  select orders into all_orders
  from public.insights_sales_summary(ids, null, null, 'online', true, 'all', 20);

  results := results || format('%s T1 antecipadas excluem D0 e pós-evento (esperado 2, recebeu %s)',
    case when advance_orders = 2 then 'PASS' else 'FAIL' end, advance_orders);
  results := results || format('%s T2 D0 considera a data do evento, sábado ou quarta (esperado 2, recebeu %s)',
    case when event_day_orders = 2 then 'PASS' else 'FAIL' end, event_day_orders);
  results := results || format('%s T3 todas mantém o comportamento integral (esperado 6, recebeu %s)',
    case when all_orders = 6 then 'PASS' else 'FAIL' end, all_orders);

  select coalesce(sum(b.orders), 0), coalesce(sum(b.event_day_orders), 0), coalesce(sum(b.avg_orders_share), 0)
    into total_breakdown, d0_breakdown, average_total
  from public.insights_sales_breakdown('dow', ids, null, null, 'online', true, 20, 'all') b;

  results := results || format('%s T4 gráfico por dia da semana soma 6 vendas e isola 2 D0 (total %s / D0 %s)',
    case when total_breakdown = 6 and d0_breakdown = 2 then 'PASS' else 'FAIL' end, total_breakdown, d0_breakdown);
  results := results || format('%s T5 média normalizada dá o mesmo peso aos dois eventos (soma aproximada 100%%, recebeu %s%%)',
    case when average_total between 99.8 and 100.2 then 'PASS' else 'FAIL' end, average_total);

  select coalesce(sum(c.orders), 0) into d0_orders
  from public.insights_sales_cross(ids, null, null, 'online', true, 'all') c
  where c.lead_band = 'D0';

  results := results || format('%s T6 cruzamento mantém D0 separado (esperado 2, recebeu %s)',
    case when d0_orders = 2 then 'PASS' else 'FAIL' end, d0_orders);

  select coalesce(sum(d.orders), 0), coalesce(sum(d.event_day_orders), 0)
    into daily_orders, d0_daily
  from public.insights_sales_daily(ids, null, null, 'online', true, 'all', 20) d;

  results := results || format('%s T7 evolução diária soma 6 vendas e separa 2 D0 (total %s / D0 %s)',
    case when daily_orders = 6 and d0_daily = 2 then 'PASS' else 'FAIL' end, daily_orders, d0_daily);

  begin
    perform * from public.insights_sales_summary(ids, null, null, 'online', true, 'invalid', 20);
    error_message := 'Tipo de análise inválido foi aceito';
    results := results || 'FAIL T8 validação do tipo de análise';
  exception when others then
    if sqlerrm like 'Tipo de análise inválido:%' then
      results := results || 'PASS T8 tipo de análise inválido é recusado';
    else
      raise;
    end if;
  end;

  reset role;
  raise exception E'RESULTADOS Insights D0 (tudo desfeito): % PASS / % FAIL\n%',
    (select count(*) from unnest(results) x where x like 'PASS%'),
    (select count(*) from unnest(results) x where x like 'FAIL%'),
    array_to_string(results, E'\n');
end;
$test$;
