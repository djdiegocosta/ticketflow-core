-- Testes da Etapa 1 do Insights (migration 20261031120000).
-- Rode DEPOIS da migration (ou cole a migration + este arquivo juntos para ensaio).
-- Termina de propósito com o erro "RESULTADOS etapa 1 (tudo desfeito)": isso DESFAZ os dados de teste.
DO $t$
DECLARE
  res text[] := '{}'; org uuid; ev uuid; b1 uuid; b2 uuid; adm uuid := gen_random_uuid(); v timestamptz; n int; n2 int; r record; sid uuid;
BEGIN
  select id into org from public.organizations limit 1;

  -- E1: colunas e valores padrão
  res := res || format('%s E1 colunas novas existem (sales.is_test boolean not null default false; events.sales_open_at timestamptz)',
    case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='sales' and column_name='is_test' and data_type='boolean' and is_nullable='NO' and column_default='false')
          and exists (select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='sales_open_at' and data_type like 'timestamp with time zone') then 'PASS' else 'FAIL' end);

  -- E2: só a venda de teste está marcada
  select count(*) filter (where is_test), count(*) filter (where sale_code like 'TEST%' and not is_test) into n, n2 from public.sales;
  res := res || format('%s E2 backfill: vendas marcadas como teste=%s (esperado 1), com código TEST sem marca=%s (esperado 0)', case when n = 1 and n2 = 0 then 'PASS' else 'FAIL' end, n, n2);

  -- E3: abertura dos eventos reais
  res := res || format('%s E3 e-o-beat abre no momento da criação do evento',
    case when (select e.sales_open_at = e.created_at from public.events e where e.slug = 'e-o-beat') then 'PASS' else 'FAIL' end);
  res := res || format('%s E3b demais eventos abrem no início do 1º lote de venda',
    case when not exists (select 1 from public.events e where e.slug <> 'e-o-beat'
      and e.sales_open_at is distinct from (select min(b.starts_at) from public.ticket_batches b where b.event_id = e.id and not b.is_courtesy and b.starts_at is not null)
      and exists (select 1 from public.ticket_batches b where b.event_id = e.id and not b.is_courtesy and b.starts_at is not null)) then 'PASS' else 'FAIL' end);
  res := res || format('%s E3c função devolve a mesma abertura gravada para todos os eventos que têm valor',
    case when not exists (select 1 from public.events e where e.sales_open_at is not null and public.event_sales_open_at(e.id) <> e.sales_open_at) then 'PASS' else 'FAIL' end);

  -- E4: ordem de precedência da função (evento sintético)
  insert into public.events (organization_id, title, event_date, location, slug, status, created_at)
    values (org, 'TESTE ABERTURA', now() + interval '30 days', 'x', 'teste-abertura', 'publicado', '2026-01-01 12:00+00') returning id into ev;
  v := public.event_sales_open_at(ev);
  res := res || format('%s E4a sem lotes e sem valor: usa a criação do evento', case when v = '2026-01-01 12:00+00' then 'PASS' else 'FAIL' end);
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy)
    values (org, ev, 'Cortesia', 0, 10, '2026-01-01 10:00+00', true) returning id into b1;
  v := public.event_sales_open_at(ev);
  res := res || format('%s E4b lote de cortesia não abre as vendas', case when v = '2026-01-01 12:00+00' then 'PASS' else 'FAIL' end);
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, is_courtesy)
    values (org, ev, 'Lote 1', 10, 100, '2026-01-05 18:00+00', false) returning id into b2;
  v := public.event_sales_open_at(ev);
  res := res || format('%s E4c sem valor gravado: usa o início do 1º lote de venda', case when v = '2026-01-05 18:00+00' then 'PASS' else 'FAIL' end);
  update public.events set sales_open_at = '2026-01-03 09:00+00' where id = ev;
  v := public.event_sales_open_at(ev);
  res := res || format('%s E4d valor gravado tem prioridade', case when v = '2026-01-03 09:00+00' then 'PASS' else 'FAIL' end);
  update public.ticket_batches set starts_at = '2026-01-20 18:00+00' where id = b2;
  v := public.event_sales_open_at(ev);
  res := res || format('%s E4e editar o lote NÃO muda a abertura gravada', case when v = '2026-01-03 09:00+00' then 'PASS' else 'FAIL' end);
  res := res || format('%s E4f evento inexistente: sem resultado', case when public.event_sales_open_at(gen_random_uuid()) is null then 'PASS' else 'FAIL' end);

  -- E5: o assistente de teste do Mercado Pago marca a venda como teste (como administrador)
  insert into auth.users (id, aud, role, email, created_at, updated_at) values (adm, 'authenticated', 'authenticated', 't_adm@etapa1.test', now(), now());
  insert into public.user_roles (user_id, organization_id, role) values (adm, org, 'admin');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  select s.sale_id into sid from public.create_mp_test_sale(org) s;
  PERFORM set_config('request.jwt.claims', '', true);
  res := res || format('%s E5 create_mp_test_sale grava is_test = true', case when sid is not null and (select is_test from public.sales where id = sid) then 'PASS' else 'FAIL' end);

  -- E6: vendas normais continuam is_test = false por padrão
  res := res || format('%s E6 venda nova comum nasce is_test = false',
    case when (select count(*) from public.sales where is_test and sale_code not like 'TEST%') = 0 then 'PASS' else 'FAIL' end);

  -- E7: acesso da função
  res := res || format('%s E7 função de abertura: logado e service_role executam, anônimo não',
    case when has_function_privilege('authenticated', 'public.event_sales_open_at(uuid)', 'execute')
          and has_function_privilege('service_role', 'public.event_sales_open_at(uuid)', 'execute')
          and not has_function_privilege('anon', 'public.event_sales_open_at(uuid)', 'execute') then 'PASS' else 'FAIL' end);

  -- E8: evento ENCERRADO continua protegido, exceto a abertura das vendas
  select id into ev from public.events where is_closed limit 1;
  BEGIN
    update public.events set title = title || ' x' where id = ev;
    res := res || 'FAIL E8a evento encerrado aceitou mudança de título';
  EXCEPTION WHEN OTHERS THEN
    res := res || format('%s E8a evento encerrado continua bloqueando outras alterações [%s]', case when sqlerrm like 'Evento encerrado%' then 'PASS' else 'FAIL' end, sqlerrm);
  END;
  BEGIN
    update public.events set sales_open_at = sales_open_at + interval '1 minute' where id = ev;
    res := res || format('%s E8b evento encerrado aceita corrigir a abertura das vendas', case when (select sales_open_at from public.events where id = ev) is not null then 'PASS' else 'FAIL' end);
  EXCEPTION WHEN OTHERS THEN
    res := res || format('FAIL E8b abertura em evento encerrado foi bloqueada [%s]', sqlerrm);
  END;

  RAISE EXCEPTION E'RESULTADOS etapa 1 (tudo desfeito): % PASS / % FAIL\n%',
    (select count(*) from unnest(res) x where x like 'PASS%'), (select count(*) from unnest(res) x where x like 'FAIL%'), array_to_string(res, E'\n');
END $t$;
