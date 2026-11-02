-- Testes da fundação do Insights (migration 20261031150000): feriados, dia útil, indicadores 1 a 8 e segurança.
-- Rode DEPOIS da migration (ou cole a migration + este arquivo juntos para ensaio).
-- Termina de propósito com o erro "RESULTADOS Insights (tudo desfeito)": isso DESFAZ os dados de teste.
-- Os dados de teste ficam em 2 eventos próprios (dez/2026 e nov/2026); os cálculos filtram só por eles.
CREATE FUNCTION pg_temp.t_s(_ev uuid, _b uuid, _created timestamptz, _qty int, _total numeric, _status text DEFAULT 'pago',
  _paid timestamptz DEFAULT NULL, _courtesy boolean DEFAULT false, _test boolean DEFAULT false, _origin text DEFAULT 'ticketflow', _refunded numeric DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql AS $$
declare v uuid;
begin
  insert into public.sales (organization_id, event_id, batch_id, sale_code, buyer_name, quantity, unit_price, total_amount, created_at, status, paid_at, is_courtesy, is_test, origin, refunded_amount)
  values ((select id from public.organizations limit 1), _ev, _b, 'T' || substr(md5(random()::text), 1, 7), 'Teste', _qty, _total / _qty, _total, _created,
          case when _status = 'pago' then 'pago' else 'pendente' end::public.sale_status, _paid, _courtesy, _test, _origin::public.sale_origin, _refunded)
  returning id into v;
  if _status not in ('pago', 'pendente') then update public.sales set status = _status::public.sale_status where id = v; end if;
  return v;
end $$;

DO $t$
DECLARE
  res text[] := '{}'; org uuid; e1 uuid; e2 uuid; b1 uuid; b2 uuid; ids uuid[]; adm uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  j jsonb; r record; n int; nz int; ok boolean; msg text; vis int; rev numeric; c_tot numeric; c_d14 numeric; c_d0 numeric; c_out numeric; c_d20 numeric; c_d7 numeric;
BEGIN
  select id into org from public.organizations limit 1;

  -- Feriados e dia útil
  res := res || format('%s F1 feriados de 2026: 10 (9 fixos + Sexta-feira Santa)', case when (select count(*) from public.br_holidays where holiday_date between '2026-01-01' and '2026-12-31') = 10 then 'PASS' else 'FAIL' end);
  res := res || format('%s F2 Sexta-feira Santa 2026 a 2030 (3/4, 26/3, 14/4, 30/3, 19/4)', case when (select array_agg(holiday_date order by holiday_date) from public.br_holidays where name = 'Sexta-feira Santa') = array['2026-04-03','2027-03-26','2028-04-14','2029-03-30','2030-04-19']::date[] then 'PASS' else 'FAIL' end);
  res := res || format('%s F3 domingo e feriado (Finados, seg 02/11/2026) não são dia útil; sábado depende do parâmetro',
    case when not public.br_is_business_day('2026-11-01') and not public.br_is_business_day('2026-11-02') and public.br_is_business_day('2026-11-07', true) and not public.br_is_business_day('2026-11-07', false) then 'PASS' else 'FAIL' end);
  res := res || format('%s F4 5º dia útil: nov/2026 (com sáb 07/11, sem sáb 09/11), out/2026 (06/10 e 07/10), dez/2026 (05/12 e 07/12)',
    case when public.br_nth_business_day(2026,11,5,true) = '2026-11-07' and public.br_nth_business_day(2026,11,5,false) = '2026-11-09'
          and public.br_nth_business_day(2026,10,5,true) = '2026-10-06' and public.br_nth_business_day(2026,10,5,false) = '2026-10-07'
          and public.br_nth_business_day(2026,12,5,true) = '2026-12-05' and public.br_nth_business_day(2026,12,5,false) = '2026-12-07' then 'PASS' else 'FAIL' end);

  -- Dados de teste
  insert into public.events (organization_id, title, event_date, location, slug, status) values (org, 'TESTE INSIGHTS DEZ', '2026-12-20 23:00+00', 'x', 'teste-ins-dez', 'publicado') returning id into e1;
  insert into public.events (organization_id, title, event_date, location, slug, status) values (org, 'TESTE INSIGHTS NOV', '2026-11-14 23:00+00', 'x', 'teste-ins-nov', 'publicado') returning id into e2;
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy) values (org, e1, 'Lote', 30, 500, '2026-10-01 12:00+00', false) returning id into b1;
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy) values (org, e2, 'Lote', 30, 500, '2026-10-01 12:00+00', false) returning id into b2;
  ids := array[e1, e2];

  -- Evento de dezembro (data 20/12 20:00 BRT)
  perform pg_temp.t_s(e1, b1, '2026-12-05 12:00+00', 1, 30, 'pago', '2026-12-05 12:00+00');   -- a1 sáb 09h, D-15
  perform pg_temp.t_s(e1, b1, '2026-12-07 02:30+00', 2, 60);                                  -- a2 dom 06/12 23h30 BRT (já é 07/12 em UTC), D-14
  perform pg_temp.t_s(e1, b1, '2026-12-20 22:30+00', 1, 40);                                  -- a3 D0, 19h30
  perform pg_temp.t_s(e1, b1, '2026-12-21 02:30+00', 1, 40);                                  -- a4 D0, 23h30 BRT (depois do início do evento)
  perform pg_temp.t_s(e1, b1, '2026-12-30 15:00+00', 1, 30);                                  -- a5 pós-evento, fim do mês
  perform pg_temp.t_s(e1, b1, '2026-12-10 15:00+00', 1, 50, 'pago', NULL, false, false, 'ticketflow', 10); -- a6 reembolso parcial: receita 40
  perform pg_temp.t_s(e1, b1, '2026-12-12 15:00+00', 1, 30, 'pago', NULL, false, false, 'manual');          -- m1 bilheteria (só em manual/todas)
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'pago', NULL, true);                            -- cortesia
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'pago', NULL, false, true);                     -- teste
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'pendente');
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'expirado');
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'cancelado');
  perform pg_temp.t_s(e1, b1, '2026-12-06 15:00+00', 1, 30, 'reembolsado');
  -- Evento de novembro (data 14/11 20:00 BRT)
  perform pg_temp.t_s(e2, b2, '2026-10-31 15:00+00', 1, 30);   -- b1 sáb 31/10, fim do mês, D-14
  perform pg_temp.t_s(e2, b2, '2026-11-01 12:00+00', 1, 30);   -- b2 dom 01/11, início do mês, D-13
  perform pg_temp.t_s(e2, b2, '2026-11-03 12:00+00', 1, 30);   -- b3 ter 03/11, 1º dia útil (02/11 é feriado)
  perform pg_temp.t_s(e2, b2, '2026-11-07 12:00+00', 1, 30);   -- b4 sáb 07/11 (5º dia útil contando sábado)
  perform pg_temp.t_s(e2, b2, '2026-11-09 12:00+00', 1, 30);   -- b5 seg 09/11

  insert into auth.users (id, aud, role, email, created_at, updated_at) values (adm, 'authenticated', 'authenticated', 't_adm@ins.test', now(), now());
  insert into public.user_roles (user_id, organization_id, role) values (adm, org, 'admin');
  insert into auth.users (id, aud, role, email, created_at, updated_at) values (cli, 'authenticated', 'authenticated', 't_cli@ins.test', now(), now());
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);

  -- Resumo e exclusões
  select * into r from public.insights_sales_summary(ids);
  res := res || format('%s R1 resumo online: 11 vendas, 12 ingressos, receita 390 (reembolso parcial desconta), 2 eventos, de 31/10 a 30/12 [%s/%s/%s/%s/%s a %s]',
    case when r.orders = 11 and r.tickets = 12 and r.revenue = 390 and r.events_count = 2 and r.first_date = '2026-10-31' and r.last_date = '2026-12-30' then 'PASS' else 'FAIL' end, r.orders, r.tickets, r.revenue, r.events_count, r.first_date, r.last_date);
  res := res || format('%s R2 transparência: 10 sem data de pagamento, 1 teste, 1 cortesia, 1 manual fora [%s/%s/%s/%s]',
    case when r.orders_without_paid_at = 10 and r.tests_excluded = 1 and r.courtesies_excluded = 1 and r.other_origin_excluded = 1 then 'PASS' else 'FAIL' end, r.orders_without_paid_at, r.tests_excluded, r.courtesies_excluded, r.other_origin_excluded);
  select orders into n from public.insights_sales_summary(ids, null, null, 'all');
  select orders into nz from public.insights_sales_summary(ids, null, null, 'manual');
  res := res || format('%s R3 origem: todas=12, manual=1 [%s/%s]', case when n = 12 and nz = 1 then 'PASS' else 'FAIL' end, n, nz);
  select orders, tickets into r from public.insights_sales_summary(array[e1], '2026-12-06', '2026-12-06');
  res := res || format('%s R4 filtro de data usa o dia de Brasília (23h30 de 06/12 não vira 07/12) [%s vendas, %s ingressos]', case when r.orders = 1 and r.tickets = 2 then 'PASS' else 'FAIL' end, r.orders, r.tickets);

  -- Indicadores
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('dow', ids);
  res := res || format('%s I1 dia da semana %s', case when j = '{"Seg":1,"Ter":1,"Qua":1,"Qui":1,"Sex":0,"Sáb":3,"Dom":4}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('hour_band', ids);
  res := res || format('%s I2 faixa de horário %s', case when j = '{"00–03h":0,"04–07h":0,"08–11h":5,"12–15h":3,"16–19h":1,"20–23h":2}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('month_period', ids);
  res := res || format('%s I3 período do mês %s', case when j = '{"1 a 5":3,"6 a 10":4,"11 a 15":0,"16 a 20":2,"21 a 25":0,"26 a 31":2}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('business_day_5', ids, null, null, 'online', true);
  res := res || format('%s I4a 5º dia útil contando sábado: 4 até / 7 após %s', case when j = '{"Até o 5º dia útil":4,"Após o 5º dia útil":7}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('business_day_5', ids, null, null, 'online', false);
  res := res || format('%s I4b 5º dia útil sem sábado: 6 até / 5 após %s', case when j = '{"Até o 5º dia útil":6,"Após o 5º dia útil":5}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('month_turn', ids);
  res := res || format('%s I5 virada do mês: início 2 / meio 7 / fim 2 %s', case when j = '{"Início do mês (primeiros 3 dias)":2,"Meio do mês":7,"Fim do mês (últimos 3 dias)":2}'::jsonb then 'PASS' else 'FAIL' end, j);
  select jsonb_object_agg(bucket, orders), count(*), sum(orders) into j, n, nz from public.insights_sales_breakdown('lead_time', ids);
  res := res || format('%s I6 antecedência D-20 a D0: D-15=1, D-14=2, D-13=1, D-11=1, D-10=1, D-7=1, D-5=1, D0=2, pós-evento=1, 23 baldes, total 11',
    case when (j->>'D-15')::int = 1 and (j->>'D-14')::int = 2 and (j->>'D-13')::int = 1 and (j->>'D-11')::int = 1 and (j->>'D-10')::int = 1 and (j->>'D-7')::int = 1
          and (j->>'D-5')::int = 1 and (j->>'D0')::int = 2 and (j->>'Pós-evento')::int = 1 and (j->>'D-20')::int = 0 and (j->>'Antes de D-20')::int = 0 and n = 23 and nz = 11 then 'PASS' else 'FAIL' end);
  select jsonb_object_agg(bucket, orders) into j from public.insights_sales_breakdown('lead_time', ids, null, null, 'online', true, 10);
  res := res || format('%s I6b janela menor (D-10): D-15, D-14, D-13 e D-11 viram "Antes de D-10" (5 vendas)', case when (j->>'Antes de D-10')::int = 5 and (j->>'D-10')::int = 1 then 'PASS' else 'FAIL' end);

  -- Soma dos gráficos = total
  ok := true;
  for r in select d from unnest(array['dow','hour_band','month_period','business_day_5','month_turn','lead_time']) d loop
    select coalesce(sum(orders), 0) into n from public.insights_sales_breakdown(r.d, ids);
    if n <> 11 then ok := false; end if;
  end loop;
  res := res || format('%s I7 a soma de cada gráfico bate com o total (11)', case when ok then 'PASS' else 'FAIL' end);

  select count(*), max(cum_orders), max(cum_revenue), count(*) filter (where orders = 0) into n, nz, rev, vis from public.insights_sales_daily(ids);
  res := res || format('%s I8 evolução diária: 61 dias, 51 sem venda, acumulado final 11 vendas e receita 390 [%s dias, %s zeros, %s, %s]',
    case when n = 61 and vis = 51 and nz = 11 and rev = 390 then 'PASS' else 'FAIL' end, n, vis, nz, rev);

  select coalesce(sum(orders), 0), coalesce(sum(orders) filter (where lead_band = 'D-14 a D-8'), 0), coalesce(sum(orders) filter (where lead_band = 'D0'), 0),
         coalesce(sum(orders) filter (where lead_band = 'Fora da janela'), 0), coalesce(sum(orders) filter (where lead_band = 'D-20 a D-15'), 0), coalesce(sum(orders) filter (where lead_band = 'D-7 a D-4'), 0)
    into c_tot, c_d14, c_d0, c_out, c_d20, c_d7 from public.insights_sales_cross(ids);
  res := res || format('%s I9 cruzamento: total 11; D-14 a D-8=5, D0=2, fora da janela=1, D-20 a D-15=1, D-7 a D-4=2 [%s/%s/%s/%s/%s/%s]',
    case when c_tot = 11 and c_d14 = 5 and c_d0 = 2 and c_out = 1 and c_d20 = 1 and c_d7 = 2 then 'PASS' else 'FAIL' end, c_tot, c_d14, c_d0, c_out, c_d20, c_d7);

  -- Segurança e validação (como a API: papel authenticated)
  res := res || format('%s S1 anônimo não executa as funções; logado executa',
    case when not has_function_privilege('anon', 'public.insights_sales_summary(uuid[],date,date,text,boolean)', 'execute')
          and not has_function_privilege('anon', 'public.insights_sales_breakdown(text,uuid[],date,date,text,boolean,integer)', 'execute')
          and has_function_privilege('authenticated', 'public.insights_sales_summary(uuid[],date,date,text,boolean)', 'execute') then 'PASS' else 'FAIL' end);
  SET LOCAL ROLE authenticated;
  select orders into n from public.insights_sales_summary(ids);
  RESET ROLE;
  res := res || format('%s S2 administrador pela API (papel authenticated + regras de acesso) vê as 11 vendas [%s]', case when n = 11 then 'PASS' else 'FAIL' end, n);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cli, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN perform * from public.insights_sales_summary(ids); msg := 'executou'; EXCEPTION WHEN OTHERS THEN msg := sqlerrm; END;
  RESET ROLE;
  res := res || format('%s S3 cliente comum logado é bloqueado [%s]', case when msg = 'Sem permissão' then 'PASS' else 'FAIL' end, msg);
  PERFORM set_config('request.jwt.claims', '', true);
  BEGIN perform * from public.insights_sales_breakdown('dow', ids); msg := 'executou'; EXCEPTION WHEN OTHERS THEN msg := sqlerrm; END;
  res := res || format('%s S4 sem login é bloqueado [%s]', case when msg = 'Sem permissão' then 'PASS' else 'FAIL' end, msg);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  BEGIN perform * from public.insights_sales_breakdown('xyz', ids); msg := 'executou'; EXCEPTION WHEN OTHERS THEN msg := sqlerrm; END;
  res := res || format('%s V1 dimensão inválida é recusada [%s]', case when msg like 'Dimensão inválida%' then 'PASS' else 'FAIL' end, msg);
  BEGIN perform * from public.insights_sales_summary(ids, null, null, 'tudo'); msg := 'executou'; EXCEPTION WHEN OTHERS THEN msg := sqlerrm; END;
  res := res || format('%s V2 origem inválida é recusada [%s]', case when msg like 'Origem inválida%' then 'PASS' else 'FAIL' end, msg);
  BEGIN perform * from public.insights_sales_breakdown('lead_time', ids, null, null, 'online', true, 0); msg := 'executou'; EXCEPTION WHEN OTHERS THEN msg := sqlerrm; END;
  res := res || format('%s V3 janela de antecedência inválida é recusada [%s]', case when msg like 'Janela%' then 'PASS' else 'FAIL' end, msg);

  RAISE EXCEPTION E'RESULTADOS Insights (tudo desfeito): % PASS / % FAIL\n%',
    (select count(*) from unnest(res) x where x like 'PASS%'), (select count(*) from unnest(res) x where x like 'FAIL%'), array_to_string(res, E'\n');
END $t$;
