-- Pagamento aprovado depois que a reserva expirou: o prazo da reserva serve
-- só para criar urgência; todo pagamento aprovado deve virar ingresso.
-- Chamada apenas pelo webhook do Mercado Pago (service_role).
--
-- Regra de estoque do sistema: ticket_batches.quantity é o estoque que RESTA.
-- Ele diminui ao criar a reserva e VOLTA quando a reserva expira. Por isso, ao
-- reativar uma venda 'expirado', o estoque precisa ser baixado de novo.
--
-- Retornos: 'confirmed' | 'already_paid' | 'sold_out' | 'invalid_state' | 'not_found'
CREATE OR REPLACE FUNCTION public.confirm_late_paid_sale(_sale_id uuid, _mp_payment_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
  v_rows integer;
BEGIN
  SELECT id, status, quantity, batch_id, observation INTO v_sale
  FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_sale.status = 'pago' THEN RETURN 'already_paid'; END IF;

  IF v_sale.status = 'pendente' THEN
    -- Prazo vencido, mas a rotina de expiração ainda não rodou: o estoque
    -- continua reservado para esta venda, então só confirma.
    UPDATE public.sales
       SET status = 'pago', mp_payment_id = _mp_payment_id, paid_at = COALESCE(paid_at, now()), updated_at = now(),
           observation = trim(both E'\n' from COALESCE(observation, '') || E'\n' ||
             'Pagamento ' || _mp_payment_id || ' aprovado depois do prazo da reserva; confirmado automaticamente.')
     WHERE id = _sale_id AND status = 'pendente';
    RETURN 'confirmed';
  END IF;

  IF v_sale.status <> 'expirado' THEN RETURN 'invalid_state'; END IF;

  -- Venda expirada: o estoque já voltou para o lote; tenta pegá-lo de novo.
  -- quantity NULL = lote sem limite de estoque.
  UPDATE public.ticket_batches
     SET quantity = quantity - v_sale.quantity
   WHERE id = v_sale.batch_id
     AND (quantity IS NULL OR quantity >= v_sale.quantity);
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    IF COALESCE(v_sale.observation, '') NOT LIKE '%sem estoque%' THEN
      UPDATE public.sales
         SET observation = trim(both E'\n' from COALESCE(observation, '') || E'\n' ||
               'ATENÇÃO: pagamento ' || _mp_payment_id || ' aprovado depois da reserva expirar e o lote ficou sem estoque. Decidir: reembolsar ou liberar o ingresso.'),
             updated_at = now()
       WHERE id = _sale_id;
    END IF;
    RETURN 'sold_out';
  END IF;

  UPDATE public.sales
     SET status = 'pago', mp_payment_id = _mp_payment_id, paid_at = COALESCE(paid_at, now()), updated_at = now(),
         observation = trim(both E'\n' from COALESCE(observation, '') || E'\n' ||
           'Pagamento ' || _mp_payment_id || ' aprovado depois da reserva expirar; confirmado automaticamente e estoque baixado de novo.')
   WHERE id = _sale_id AND status = 'expirado';
  RETURN 'confirmed';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.confirm_late_paid_sale(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_late_paid_sale(uuid, text) TO service_role;
