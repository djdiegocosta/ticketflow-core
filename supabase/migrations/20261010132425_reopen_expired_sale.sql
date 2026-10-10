-- Reserva expirada nao pode impedir quem quer pagar. Reabre a reserva (se ainda
-- houver estoque) para que o Pix possa ser gerado/retomado. O prazo da reserva
-- serve para criar urgencia; nao e uma barreira de compra.
--
-- Regra de estoque: ticket_batches.quantity e o estoque que RESTA. Ele diminui
-- ao reservar e VOLTA quando a reserva expira; reabrir uma venda 'expirado'
-- exige baixar o estoque de novo.
--
-- Retornos: 'ok' | 'reopened' | 'sold_out' | 'already_paid' | 'invalid_state' | 'not_found'
CREATE OR REPLACE FUNCTION public.reopen_expired_sale(_sale_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
  v_minutes integer;
  v_rows integer;
BEGIN
  SELECT s.id, s.status, s.quantity, s.batch_id, s.expires_at, s.organization_id
    INTO v_sale
  FROM public.sales s WHERE s.id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  IF v_sale.status = 'pago' THEN RETURN 'already_paid'; END IF;

  SELECT COALESCE(o.pending_sale_expiration_minutes, 30) INTO v_minutes
  FROM public.organizations o WHERE o.id = v_sale.organization_id;
  v_minutes := COALESCE(v_minutes, 30);

  IF v_sale.status = 'pendente' THEN
    IF v_sale.expires_at IS NULL OR v_sale.expires_at > now() THEN RETURN 'ok'; END IF;
    -- Prazo vencido, mas a rotina de expiracao ainda nao rodou: o estoque
    -- continua reservado para esta venda, entao so renova o prazo.
    UPDATE public.sales
       SET expires_at = now() + make_interval(mins => v_minutes), updated_at = now()
     WHERE id = _sale_id AND status = 'pendente';
    RETURN 'reopened';
  END IF;

  IF v_sale.status <> 'expirado' THEN RETURN 'invalid_state'; END IF;

  -- Venda expirada: o estoque ja voltou para o lote; tenta pega-lo de novo.
  -- quantity NULL = lote sem limite de estoque.
  UPDATE public.ticket_batches
     SET quantity = quantity - v_sale.quantity
   WHERE id = v_sale.batch_id
     AND (quantity IS NULL OR quantity >= v_sale.quantity);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN 'sold_out'; END IF;

  UPDATE public.sales
     SET status = 'pendente', expires_at = now() + make_interval(mins => v_minutes), updated_at = now()
   WHERE id = _sale_id AND status = 'expirado';
  RETURN 'reopened';
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reopen_expired_sale(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_expired_sale(uuid) TO service_role;
