-- Teste do fallback de data de cadastro (migration 20261029120000).
-- Cliente com login em auth.users e SEM linha em profiles: a data de cadastro vem de auth.users.created_at.
-- Termina de propósito com erro "RESULTADO ... (tudo desfeito)": isso DESFAZ os dados de teste.
DO $t$
DECLARE
  org uuid; u uuid := gen_random_uuid(); c uuid; e uuid; b uuid;
  total int; conta int; compras int; ok boolean;
BEGIN
  select id into org from public.organizations limit 1;
  insert into auth.users (id, aud, role, email, created_at, updated_at)
    values (u, 'authenticated', 'authenticated', 't_np@xp.test', '2020-01-01 12:00+00', '2020-01-01 12:00+00');
  delete from public.profiles where id = u;
  insert into public.customers (organization_id, user_id, full_name, whatsapp)
    values (org, u, 'Teste sem perfil', '88000000001') returning id into c;
  insert into public.events (organization_id, title, event_date, location, slug, status)
    values (org, 'TESTE NP', '2020-03-10 22:00+00', 'x', 'teste-xp-np', 'publicado') returning id into e;
  insert into public.ticket_batches (organization_id, event_id, name, price, quantity, starts_at, ends_at, is_courtesy)
    values (org, e, 'Lote', 10, 100, '2020-02-01 12:00+00', '2021-01-01', false) returning id into b;
  -- compra ANTES do cadastro (não conta) e DEPOIS (conta)
  insert into public.sales (organization_id, event_id, batch_id, sale_code, buyer_name, quantity, unit_price, total_amount, customer_id, created_at, status, paid_at)
    values (org, e, b, 'TNP00001', 'Teste', 1, 10, 10, c, '2019-12-01 12:00+00', 'pago', '2019-12-01 12:00+00'),
           (org, e, b, 'TNP00002', 'Teste', 1, 10, 10, c, '2020-02-05 12:00+00', 'pago', '2020-02-05 12:00+00');
  select coalesce(sum(amount), 0), coalesce(sum(amount) filter (where reason = 'criar_conta'), 0),
         coalesce(sum(amount) filter (where reason = 'compra_ingresso'), 0)
    into total, conta, compras from public.customer_xp_events where customer_id = c;
  -- conta 50 + compra 200 + 1ª compra 50 + 1º comprador do evento 100 (único comprador); a compra de 2019 não conta
  ok := (total = 400 and conta = 50 and compras = 200);
  RAISE EXCEPTION E'RESULTADO fallback de cadastro (tudo desfeito): % | total=% (400) conta=% (50) compras=% (200)', case when ok then 'PASS' else 'FAIL' end, total, conta, compras;
END $t$;
