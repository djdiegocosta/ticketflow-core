-- Testes das regras de XP v3 (migration 20261028230000).
--
-- Como usar: cole no SQL Editor do Supabase (ou rode via MCP) DEPOIS da migration aplicada
-- (ou, para ensaio, cole a migration + este arquivo juntos: tudo é desfeito). Termina de
-- propósito com o erro "RESULTADOS XP v3 (tudo desfeito)": isso DESFAZ todos os dados de teste.
-- Leia o texto do erro: cada linha é PASS ou FAIL.
--
-- Usa datas em 2020 (contas, eventos, vendas) para não interferir nos dados reais.
CREATE FUNCTION pg_temp.t_org() RETURNS uuid LANGUAGE sql AS $$ select id from public.organizations limit 1 $$;

CREATE FUNCTION pg_temp.t_guest(_tag text) RETURNS uuid LANGUAGE plpgsql AS $$
declare v uuid;
begin
  insert into public.customers (organization_id, full_name, whatsapp)
  values (pg_temp.t_org(), 'Teste ' || _tag, '88' || lpad((random()*1e9)::bigint::text, 9, '0')) returning id into v;
  return v;
end $$;

-- Cria conta (auth + perfil com data de cadastro controlada) e liga ao cliente.
CREATE FUNCTION pg_temp.t_link(_cust uuid, _tag text, _signup timestamptz) RETURNS void LANGUAGE plpgsql AS $$
declare u uuid := gen_random_uuid();
begin
  insert into auth.users (id, aud, role, email, created_at, updated_at, raw_user_meta_data)
  values (u, 'authenticated', 'authenticated', 't_' || _tag || '@xp.test', _signup, _signup, jsonb_build_object('full_name', 'Teste ' || _tag));
  update public.profiles set created_at = _signup where id = u;
  update public.customers set user_id = u where id = _cust;
end $$;

CREATE FUNCTION pg_temp.t_user(_tag text, _signup timestamptz) RETURNS uuid LANGUAGE plpgsql AS $$
declare c uuid := pg_temp.t_guest(_tag);
begin
  perform pg_temp.t_link(c, _tag, _signup);
  return c;
end $$;

-- Evento + lote de venda que abre em _opens + lote de cortesia que abre 2 dias ANTES (não conta como abertura).
CREATE FUNCTION pg_temp.t_event(_tag text, _date timestamptz, _opens timestamptz) RETURNS uuid LANGUAGE plpgsql AS $$
declare e uuid;
begin
  insert into public.events (organization_id, title, event_date, location, slug, status)
  values (pg_temp.t_org(), 'TESTE ' || _tag, _date, 'Teste', 'teste-xp-' || _tag, 'publicado') returning id into e;
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, ends_at, is_courtesy)
  values (pg_temp.t_org(), e, 'Lote', 10, 1000, _opens, _opens + interval '400 days', false),
         (pg_temp.t_org(), e, 'Cortesia', 0, 10, _opens - interval '2 days', _opens + interval '400 days', true);
  return e;
end $$;

CREATE FUNCTION pg_temp.t_sale(_cust uuid, _ev uuid, _qty int, _created timestamptz, _status text DEFAULT 'pago', _insert boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql AS $$
declare v uuid; b uuid;
begin
  select id into b from public.ticket_batches where event_id = _ev and not is_courtesy limit 1;
  insert into public.sales (organization_id, event_id, batch_id, sale_code, buyer_name, quantity, unit_price, total_amount, customer_id, created_at, status, paid_at)
  values (pg_temp.t_org(), _ev, b, 'T' || substr(md5(random()::text), 1, 7), 'Teste', _qty, 10, 10 * _qty, _cust, _created,
          case when _insert then _status::public.sale_status else 'pendente'::public.sale_status end,
          case when _insert and _status = 'pago' then _created end)
  returning id into v;
  if not _insert and _status <> 'pendente' then
    update public.sales set status = _status::public.sale_status, paid_at = case when _status = 'pago' then _created end where id = v;
  end if;
  return v;
end $$;

CREATE FUNCTION pg_temp.t_checkin(_sale uuid, _when timestamptz) RETURNS uuid LANGUAGE plpgsql AS $$
declare t uuid; s record;
begin
  select * into s from public.sales where id = _sale;
  insert into public.tickets (organization_id, sale_id, event_id, batch_id, ticket_code, participant_name, status)
  values (s.organization_id, s.id, s.event_id, s.batch_id, 'TK' || substr(md5(random()::text), 1, 8), 'Teste', 'valido') returning id into t;
  update public.tickets set status = 'utilizado', checked_in_at = _when where id = t;
  return t;
end $$;

CREATE FUNCTION pg_temp.xp(_cust uuid, _reason text DEFAULT NULL) RETURNS int LANGUAGE sql AS $$
  select coalesce(sum(amount), 0)::int from public.customer_xp_events where customer_id = _cust and (_reason is null or reason = _reason)
$$;

CREATE TEMP TABLE t_res (n serial, name text, ok boolean, detail text);

DO $t$
DECLARE
  sg timestamptz := '2020-01-01 12:00+00';
  e1 uuid; e2 uuid; e3 uuid; e4 uuid; e5 uuid; ef uuid;
  p uuid; a uuid; g uuid; l uuid; b uuid; q uuid; ly uuid; ln uuid; lf uuid; m uuid; adm uuid; outro uuid;
  sa1 uuid; sa2 uuid; sa3 uuid; sb uuid; sp5 uuid; sq5 uuid; s uuid; tk uuid;
  v int; n int; n2 int; h1 text; h2 text; r1 record; r2 record; uid_a uuid; uid_adm uuid; total int; vistas int; alheias int;
  caio uuid[]; esperado int; ativo int; ok_anon boolean;
BEGIN
  e1 := pg_temp.t_event('e1', '2020-02-10 22:00+00', '2020-02-01 12:00+00');
  e2 := pg_temp.t_event('e2', '2020-03-10 22:00+00', '2020-03-01 12:00+00');
  e3 := pg_temp.t_event('e3', '2020-04-10 22:00+00', '2020-04-01 12:00+00');
  e4 := pg_temp.t_event('e4', '2020-05-10 22:00+00', '2020-05-01 12:00+00');
  e5 := pg_temp.t_event('e5', '2020-07-10 22:00+00', '2020-07-01 12:00+00');
  ef := pg_temp.t_event('ef', '2099-01-01 22:00+00', '2020-06-01 12:00+00');

  -- Convidado (sem conta) compra primeiro de todos em e1: não pode ganhar nada nem roubar o "primeiro comprador".
  g := pg_temp.t_guest('guest');
  perform pg_temp.t_sale(g, e1, 1, '2020-02-01 12:30+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T6 convidado sem conta: 0 XP', pg_temp.xp(g) = 0, 'xp=' || pg_temp.xp(g));
  INSERT INTO t_res(name, ok, detail) VALUES ('T6b venda sem cliente (customer_id nulo): nenhuma linha', not exists (select 1 from public.customer_xp_events where customer_id is null), '');

  -- Pioneiro: 1ª compra de cada evento, 1h após a abertura (1º dia de vendas).
  p := pg_temp.t_user('pioneiro', sg);
  INSERT INTO t_res(name, ok, detail) VALUES ('T1 criação de conta: +50', pg_temp.xp(p) = 50 and pg_temp.xp(p, 'criar_conta') = 50, 'xp=' || pg_temp.xp(p));
  perform pg_temp.t_sale(p, e1, 1, '2020-02-01 13:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T9 primeiro comprador: pioneiro (convidado mais cedo não conta)', exists (select 1 from public.customer_xp_events where reason = 'primeiro_comprador' and event_id = e1 and customer_id = p), '');
  INSERT INTO t_res(name, ok, detail) VALUES ('T9b um único primeiro comprador por evento', (select count(*) from public.customer_xp_events where reason = 'primeiro_comprador' and event_id = e1) = 1, '');
  INSERT INTO t_res(name, ok, detail) VALUES ('T-dia 1º dia de vendas: +50 (cortesia mais cedo não abre as vendas)', pg_temp.xp(p, 'compra_primeiro_dia') = 50, 'xp_primeiro_dia=' || pg_temp.xp(p, 'compra_primeiro_dia'));
  INSERT INTO t_res(name, ok, detail) VALUES ('T2a pioneiro e1: 50+200+50+100+50 = 450', pg_temp.xp(p) = 450, 'xp=' || pg_temp.xp(p));
  perform pg_temp.t_sale(p, e2, 1, '2020-03-01 13:00+00');
  perform pg_temp.t_sale(p, e3, 1, '2020-04-01 13:00+00');
  perform pg_temp.t_sale(p, e4, 1, '2020-05-01 13:00+00');
  perform pg_temp.t_sale(p, ef, 1, '2020-06-01 13:00+00');

  -- A: compras e check-in
  a := pg_temp.t_user('a', sg);
  sa1 := pg_temp.t_sale(a, e1, 1, '2020-02-05 15:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T2 primeira compra paga: +200 +50', pg_temp.xp(a) = 300 and pg_temp.xp(a, 'primeira_compra') = 50 and pg_temp.xp(a, 'compra_ingresso') = 200, 'xp=' || pg_temp.xp(a));
  sa2 := pg_temp.t_sale(a, e2, 3, '2020-03-06 15:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T3 compra de 3 ingressos: +200 +100 de grupo', pg_temp.xp(a) = 600 and pg_temp.xp(a, 'compra_grupo') = 100, 'xp=' || pg_temp.xp(a));
  sa3 := pg_temp.t_sale(a, e2, 1, '2020-03-07 15:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T4 segunda compra no mesmo evento: +200 +50 adicional', pg_temp.xp(a) = 850 and pg_temp.xp(a, 'compra_adicional') = 50, 'xp=' || pg_temp.xp(a));
  tk := pg_temp.t_checkin(sa1, '2020-02-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T5 check-in válido: +50', pg_temp.xp(a) = 900 and pg_temp.xp(a, 'comparecimento') = 50, 'xp=' || pg_temp.xp(a));
  tk := pg_temp.t_checkin(sa1, '2020-02-10 23:30+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T5b segundo ingresso do mesmo evento não dá XP de novo', pg_temp.xp(a, 'comparecimento') = 50, '');

  -- L: comprou ANTES de criar a conta; depois cria conta e compra de novo
  l := pg_temp.t_guest('late');
  perform pg_temp.t_sale(l, e1, 1, '2020-02-06 15:00+00');
  perform pg_temp.t_link(l, 'late', '2020-02-20 12:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T7 conta criada depois da compra: só +50 de conta, sem retroativo', pg_temp.xp(l) = 50, 'xp=' || pg_temp.xp(l));
  perform pg_temp.t_sale(l, e3, 1, '2020-04-06 15:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T7b compra posterior à conta vale (conta 50 + 200 + 50 de 1ª compra)', pg_temp.xp(l) = 300, 'xp=' || pg_temp.xp(l));

  -- B: estados que não geram XP e revogação por cancelamento
  b := pg_temp.t_user('b', sg);
  perform pg_temp.t_sale(b, e1, 1, '2020-02-08 15:00+00', 'pendente');
  perform pg_temp.t_sale(b, e1, 1, '2020-02-08 16:00+00', 'expirado');
  perform pg_temp.t_sale(b, e1, 1, '2020-02-08 17:00+00', 'cancelado');
  perform pg_temp.t_sale(b, e1, 1, '2020-02-08 18:00+00', 'reembolsado');
  INSERT INTO t_res(name, ok, detail) VALUES ('T8 pendente/expirado/cancelado/reembolsado: 0 XP (só a conta)', pg_temp.xp(b) = 50, 'xp=' || pg_temp.xp(b));
  sb := pg_temp.t_sale(b, e1, 1, '2020-02-09 15:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T8b venda paga vira XP', pg_temp.xp(b) = 300, 'xp=' || pg_temp.xp(b));
  update public.sales set status = 'cancelado' where id = sb;
  INSERT INTO t_res(name, ok, detail) VALUES ('T8c pago depois cancelado: XP revogado', pg_temp.xp(b) = 50, 'xp=' || pg_temp.xp(b));

  -- Venda lançada já como "pago" (venda manual): gatilho de INSERT
  m := pg_temp.t_user('m', sg);
  perform pg_temp.t_sale(m, e2, 1, '2020-03-08 15:00+00', 'pago', true);
  INSERT INTO t_res(name, ok, detail) VALUES ('T-ins venda inserida já paga gera XP (conta 50 + 200 + 50)', pg_temp.xp(m) = 300, 'xp=' || pg_temp.xp(m));

  -- Primeiro comprador: transferência quando o 1º cancela (e5) + duplicidade bloqueada
  q := pg_temp.t_user('q', sg);
  sp5 := pg_temp.t_sale(p, e5, 1, '2020-07-01 13:00+00');
  sq5 := pg_temp.t_sale(q, e5, 1, '2020-07-01 14:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T9c e5: 1º comprador = pioneiro', exists (select 1 from public.customer_xp_events where reason = 'primeiro_comprador' and event_id = e5 and customer_id = p), '');
  update public.sales set status = 'cancelado' where id = sp5;
  INSERT INTO t_res(name, ok, detail) VALUES ('T9d 1º comprador cancelou: bônus passa ao próximo (uma só linha)',
    (select count(*) from public.customer_xp_events where reason = 'primeiro_comprador' and event_id = e5) = 1
    and exists (select 1 from public.customer_xp_events where reason = 'primeiro_comprador' and event_id = e5 and customer_id = q), '');
  BEGIN
    insert into public.customer_xp_events (customer_id, organization_id, amount, reason, event_id, source_key)
    values (a, pg_temp.t_org(), 100, 'primeiro_comprador', e5, 'event:' || e5::text || ':first-buyer');
    INSERT INTO t_res(name, ok, detail) VALUES ('T9e duplicar o bônus de primeiro comprador é bloqueado', false, 'inseriu duplicado');
  EXCEPTION WHEN unique_violation THEN
    INSERT INTO t_res(name, ok, detail) VALUES ('T9e duplicar o bônus de primeiro comprador é bloqueado', true, 'unique_violation');
  END;

  -- Fidelidade
  ly := pg_temp.t_user('ly', sg);
  s := pg_temp.t_sale(ly, e1, 1, '2020-02-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-02-10 23:00+00');
  s := pg_temp.t_sale(ly, e2, 1, '2020-03-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-03-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T10a dois eventos seguidos: ainda sem fidelidade', pg_temp.xp(ly, 'fidelidade') = 0, '');
  s := pg_temp.t_sale(ly, e3, 1, '2020-04-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-04-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T10 três eventos consecutivos com compra e check-in: +200 de fidelidade', pg_temp.xp(ly, 'fidelidade') = 200 and (select count(*) from public.customer_xp_events where customer_id = ly and reason = 'fidelidade') = 1, 'fidelidade=' || pg_temp.xp(ly, 'fidelidade'));
  s := pg_temp.t_sale(ly, e4, 1, '2020-05-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-05-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T10b 4º evento seguido não repete o bônus do mesmo bloco', pg_temp.xp(ly, 'fidelidade') = 200, 'fidelidade=' || pg_temp.xp(ly, 'fidelidade'));

  ln := pg_temp.t_user('ln', sg);
  s := pg_temp.t_sale(ln, e1, 1, '2020-02-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-02-10 23:00+00');
  s := pg_temp.t_sale(ln, e2, 1, '2020-03-07 15:00+00');  -- comprou e NÃO compareceu
  s := pg_temp.t_sale(ln, e3, 1, '2020-04-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-04-10 23:00+00');
  s := pg_temp.t_sale(ln, e4, 1, '2020-05-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-05-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T11 falta no meio (compra sem check-in): sem fidelidade', pg_temp.xp(ln, 'fidelidade') = 0, '');

  lf := pg_temp.t_user('lf', sg);
  s := pg_temp.t_sale(lf, e1, 1, '2020-02-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-02-10 23:00+00');
  s := pg_temp.t_sale(lf, e2, 1, '2020-03-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-03-10 23:00+00');
  s := pg_temp.t_sale(lf, ef, 1, '2020-06-07 15:00+00'); perform pg_temp.t_checkin(s, '2020-06-10 23:00+00');
  INSERT INTO t_res(name, ok, detail) VALUES ('T11b evento futuro não completa a sequência', pg_temp.xp(lf, 'fidelidade') = 0, '');

  -- Reprocessamento e recálculo global duas vezes
  select string_agg(source_key || ':' || amount || ':' || customer_id::text, ',' order by source_key) into h1 from public.customer_xp_events;
  update public.sales set status = 'pago' where status = 'pago' and created_at < '2021-01-01';
  update public.tickets set status = 'utilizado' where status = 'utilizado' and checked_in_at < '2021-01-01';
  select string_agg(source_key || ':' || amount || ':' || customer_id::text, ',' order by source_key) into h2 from public.customer_xp_events;
  INSERT INTO t_res(name, ok, detail) VALUES ('T12 reprocessar vendas e check-ins não duplica XP', h1 = h2, '');
  select * into r1 from public.rebuild_customer_xp();
  select * into r2 from public.rebuild_customer_xp();
  INSERT INTO t_res(name, ok, detail) VALUES ('T13 recálculo global 2x: 2ª execução não muda nada', r2.inserted = 0 and r2.updated = 0 and r2.deleted = 0, '1ª=' || r1.inserted || '/' || r1.updated || '/' || r1.deleted || ' 2ª=' || r2.inserted || '/' || r2.updated || '/' || r2.deleted);
  select string_agg(source_key || ':' || amount || ':' || customer_id::text, ',' order by source_key) into h2 from public.customer_xp_events;
  INSERT INTO t_res(name, ok, detail) VALUES ('T13b saldo final idêntico após 2 recálculos', h1 = h2, '');
  INSERT INTO t_res(name, ok, detail) VALUES ('T13c nenhuma chave de origem duplicada e nenhuma linha sem chave', not exists (select source_key from public.customer_xp_events group by 1 having count(*) > 1) and not exists (select 1 from public.customer_xp_events where source_key is null), '');
  INSERT INTO t_res(name, ok, detail) VALUES ('T13d sem XP para cliente sem conta', not exists (select 1 from public.customer_xp_events x join public.customers c on c.id = x.customer_id where c.user_id is null), '');

  -- Caso Caio (dados reais)
  select array_agg(id) into caio from public.customers where full_name ilike 'Caio Luiz da Silva Santos%';
  select coalesce(sum(amount), 0)::int into esperado from public.xp_expected_ledger(caio);
  select coalesce(sum(amount), 0)::int into ativo from public.customer_xp_events where customer_id = any(caio);
  INSERT INTO t_res(name, ok, detail) VALUES ('T14 Caio: saldo ativo = esperado pelas regras (' || coalesce(esperado::text, '?') || ')', esperado = ativo and esperado > 0, 'esperado=' || esperado || ' ativo=' || ativo);

  -- Segurança (RLS e privilégios)
  INSERT INTO t_res(name, ok, detail) VALUES ('T15a cliente comum não executa rebuild_customer_xp', not has_function_privilege('authenticated', 'public.rebuild_customer_xp()', 'execute') and not has_function_privilege('anon', 'public.rebuild_customer_xp()', 'execute'), '');
  INSERT INTO t_res(name, ok, detail) VALUES ('T15b cliente comum sem escrita no ledger', not has_table_privilege('authenticated', 'public.customer_xp_events', 'insert') and not has_table_privilege('authenticated', 'public.customer_xp_events', 'update') and not has_table_privilege('authenticated', 'public.customer_xp_events', 'delete') and not has_table_privilege('anon', 'public.customer_xp_events', 'select'), '');
  select user_id into uid_a from public.customers where id = a;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid_a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  select count(*), count(*) filter (where customer_id <> a) into vistas, alheias from public.customer_xp_events;
  RESET ROLE;
  INSERT INTO t_res(name, ok, detail) VALUES ('T15c cliente logado vê só o próprio XP (RLS)', vistas > 0 and alheias = 0, 'viu ' || vistas || ' linhas, ' || alheias || ' de outros');

  adm := gen_random_uuid();
  insert into auth.users (id, aud, role, email, created_at, updated_at) values (adm, 'authenticated', 'authenticated', 't_adm@xp.test', sg, sg);
  insert into public.user_roles (user_id, organization_id, role) values (adm, pg_temp.t_org(), 'admin');
  select count(*) into total from public.customer_xp_events;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  select count(*) into vistas from public.customer_xp_events;
  RESET ROLE;
  INSERT INTO t_res(name, ok, detail) VALUES ('T15d admin vê o XP de todos', vistas = total, 'viu ' || vistas || ' de ' || total);

  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;
  BEGIN
    select count(*) into vistas from public.customer_xp_events;
    ok_anon := false;
  EXCEPTION WHEN insufficient_privilege THEN
    ok_anon := true;
  END;
  RESET ROLE;
  INSERT INTO t_res(name, ok, detail) VALUES ('T15e visitante anônimo não lê XP', ok_anon, '');

  RAISE EXCEPTION E'RESULTADOS XP v3 (tudo desfeito):\n%', (select string_agg(case when ok then 'PASS ' else 'FAIL ' end || name || case when detail <> '' then '  [' || detail || ']' else '' end, E'\n' order by n) from t_res);
END
$t$;
