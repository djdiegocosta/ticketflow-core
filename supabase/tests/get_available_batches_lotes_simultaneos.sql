-- Teste de regressão: lotes ativos ao mesmo tempo na página pública + checkout.
--
-- Como usar: cole no SQL Editor do Supabase (ou rode via MCP). Ele termina de
-- propósito com um erro "RESULTADOS (tudo desfeito)": isso DESFAZ tudo o que ele
-- alterou (estoques, datas, vendas de teste). Leia o texto desse erro.
--
-- Pré-requisito: um evento publicado e aberto com 2 lotes pagos ativos ao mesmo
-- tempo, 1 lote de cortesia e 1 lote que ainda não começou. Ajuste as variáveis
-- v_evento / v_lote_a / v_lote_b / v_lote_futuro para o evento que quiser.
--
-- Esperado: L1 mostra os dois lotes; L2/L3 mostram só o que tem estoque (um não
-- depende do outro); L4/L5 respeitam as datas; L6 aceita lote sem limite de estoque;
-- L7 mantém cortesia e lote futuro fora; L8 devolve vazio sem estoque. C1/C2 vendem
-- cada lote pelo preço e estoque dele; C3-C6 recusam lote futuro, cortesia, estoque
-- insuficiente e prazo vencido.
DO $t$
DECLARE
  v_evento text := 'Halloween Fantasy 2026';
  v_lote_a text := '1º Lote';
  v_lote_b text := 'Lote Especial + COPO';
  v_lote_futuro text := '2º Lote';
  r text := ''; ev uuid; a uuid; b uuid; cort uuid; fut uuid; res record; v_err text; lotes text;
  preco_a numeric; preco_b numeric; est_a int; est_b int; ini_b timestamptz; fim_b timestamptz; n int; qa int; qb int;
BEGIN
  SELECT id INTO ev FROM public.events WHERE title = v_evento AND status = 'publicado' AND NOT is_closed;
  IF ev IS NULL THEN RAISE EXCEPTION 'Evento aberto "%" não encontrado: ajuste as variáveis do teste', v_evento; END IF;
  SELECT id, price, quantity INTO a, preco_a, est_a FROM public.ticket_batches WHERE event_id = ev AND name = v_lote_a;
  SELECT id, price, quantity, starts_at, ends_at INTO b, preco_b, est_b, ini_b, fim_b FROM public.ticket_batches WHERE event_id = ev AND name = v_lote_b;
  SELECT id INTO fut  FROM public.ticket_batches WHERE event_id = ev AND name = v_lote_futuro;
  SELECT id INTO cort FROM public.ticket_batches WHERE event_id = ev AND is_courtesy LIMIT 1;

  -- LISTAGEM
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat('L1) lotes exibidos (esperado: ', v_lote_a, ' | ', v_lote_b, '): ', lotes);

  UPDATE public.ticket_batches SET quantity = 0 WHERE id = b;
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL2) ', v_lote_b, ' esgotado (esperado: só ', v_lote_a, '): ', lotes);
  UPDATE public.ticket_batches SET quantity = est_b WHERE id = b;

  UPDATE public.ticket_batches SET quantity = 0 WHERE id = a;
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL3) ', v_lote_a, ' esgotado (esperado: só ', v_lote_b, ', sem depender do anterior): ', lotes);
  UPDATE public.ticket_batches SET quantity = est_a WHERE id = a;

  UPDATE public.ticket_batches SET ends_at = now() - interval '1 minute' WHERE id = b;
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL4) ', v_lote_b, ' com prazo vencido (esperado: só ', v_lote_a, '): ', lotes);
  UPDATE public.ticket_batches SET ends_at = fim_b WHERE id = b;

  UPDATE public.ticket_batches SET starts_at = now() + interval '1 hour' WHERE id = b;
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL5) ', v_lote_b, ' que ainda não começou (esperado: só ', v_lote_a, '): ', lotes);
  UPDATE public.ticket_batches SET starts_at = ini_b WHERE id = b;

  UPDATE public.ticket_batches SET quantity = NULL WHERE id = b;
  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL6) ', v_lote_b, ' sem limite de estoque (esperado: os dois): ', lotes);
  UPDATE public.ticket_batches SET quantity = est_b WHERE id = b;

  SELECT string_agg(name, ' | ') INTO lotes FROM public.get_available_batches(ev);
  r := concat(r, E'\nL7) cortesia na lista: ', (lotes LIKE '%' || (SELECT name FROM public.ticket_batches WHERE id = cort) || '%')::text,
    ' | lote futuro na lista: ', (lotes LIKE '%' || v_lote_futuro || '%')::text, ' (esperado: false e false)');

  UPDATE public.ticket_batches SET quantity = 0 WHERE id IN (a, b);
  SELECT count(*) INTO n FROM public.get_available_batches(ev);
  r := concat(r, E'\nL8) todos sem estoque (esperado 0 lotes): ', n);
  UPDATE public.ticket_batches SET quantity = est_a WHERE id = a;
  UPDATE public.ticket_batches SET quantity = est_b WHERE id = b;

  -- CHECKOUT como VISITANTE (sem login)
  EXECUTE 'SET LOCAL ROLE anon';
  SELECT * INTO res FROM public.create_pending_sale(ev, b, 'Teste B', '22991110001', 'b@teste.invalid', 2, ARRAY['A','B'], NULL, NULL);
  EXECUTE 'RESET ROLE';
  SELECT quantity INTO qb FROM public.ticket_batches WHERE id = b;
  r := concat(r, E'\nC1) 2x ', v_lote_b, ': total=', res.total_amount, ' (esperado ', preco_b * 2, ') | preço unitário gravado=',
    (SELECT unit_price FROM public.sales WHERE id = res.sale_id), ' | lote gravado correto=',
    (SELECT (batch_id = b)::text FROM public.sales WHERE id = res.sale_id), ' | estoque ', est_b, '->', qb, ' (esperado ', est_b - 2, ')');

  EXECUTE 'SET LOCAL ROLE anon';
  SELECT * INTO res FROM public.create_pending_sale(ev, a, 'Teste A', '22991110002', 'a@teste.invalid', 1, ARRAY['C'], NULL, NULL);
  EXECUTE 'RESET ROLE';
  SELECT quantity INTO qa FROM public.ticket_batches WHERE id = a;
  r := concat(r, E'\nC2) 1x ', v_lote_a, ': total=', res.total_amount, ' (esperado ', preco_a, ') | lote gravado correto=',
    (SELECT (batch_id = a)::text FROM public.sales WHERE id = res.sale_id), ' | estoque ', est_a, '->', qa, ' (esperado ', est_a - 1, ') | estoque do outro lote segue ',
    (SELECT quantity FROM public.ticket_batches WHERE id = b), ' (esperado ', est_b - 2, ')');

  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM * FROM public.create_pending_sale(ev, fut, 'Teste', '22991110003', 'c@teste.invalid', 1, ARRAY['D'], NULL, NULL);
    v_err := 'PASSOU (ERRO!)';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  r := concat(r, E'\nC3) lote que ainda não começou: ', v_err);
  BEGIN
    PERFORM * FROM public.create_pending_sale(ev, cort, 'Teste', '22991110004', 'd@teste.invalid', 1, ARRAY['E'], NULL, NULL);
    v_err := 'PASSOU (ERRO!)';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  r := concat(r, E'\nC4) lote de cortesia: ', v_err);
  EXECUTE 'RESET ROLE';

  UPDATE public.ticket_batches SET quantity = 1 WHERE id = b;
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM * FROM public.create_pending_sale(ev, b, 'Teste', '22991110005', 'e@teste.invalid', 2, ARRAY['F','G'], NULL, NULL);
    v_err := 'PASSOU (ERRO!)';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  r := concat(r, E'\nC5) 2 ingressos com só 1 em estoque: ', v_err);
  EXECUTE 'RESET ROLE';

  UPDATE public.ticket_batches SET ends_at = now() - interval '1 minute' WHERE id = b;
  EXECUTE 'SET LOCAL ROLE anon';
  BEGIN
    PERFORM * FROM public.create_pending_sale(ev, b, 'Teste', '22991110006', 'f@teste.invalid', 1, ARRAY['H'], NULL, NULL);
    v_err := 'PASSOU (ERRO!)';
  EXCEPTION WHEN OTHERS THEN v_err := SQLERRM; END;
  r := concat(r, E'\nC6) lote com prazo vencido: ', v_err);
  EXECUTE 'RESET ROLE';

  RAISE EXCEPTION E'RESULTADOS (tudo desfeito):\n%', r;
END $t$;
