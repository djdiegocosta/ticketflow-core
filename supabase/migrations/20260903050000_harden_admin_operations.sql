-- Bloco 4: hardening das operações administrativas e concorrência de check-in.

REVOKE EXECUTE ON FUNCTION public.update_customer(uuid, text, text, text, text, date, public.customer_gender) FROM anon;
REVOKE EXECUTE ON FUNCTION public.checkin_ticket(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_sale_manual(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_courtesy(uuid, uuid, text[], uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_courtesy_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_mp_credentials(text, text, text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.confirm_sale_manual(_sale_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_updated integer; v_participant_names jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Sem permissão: apenas administradores podem confirmar venda manualmente';
  END IF;
  UPDATE public.sales
  SET status='pago', verification_type='manual_admin', updated_at=now()
  WHERE id=_sale_id AND status='pendente' AND (expires_at IS NULL OR expires_at > now())
  RETURNING pending_participant_names INTO v_participant_names;
  GET DIAGNOSTICS v_updated=ROW_COUNT;
  IF v_updated=0 THEN RAISE EXCEPTION 'Venda não encontrada, expirada ou não está mais pendente'; END IF;
  PERFORM public.create_locked_tickets(_sale_id, v_participant_names);
END;
$$;

-- The return shape is extended with the actual expiration used by checkout.
DROP FUNCTION IF EXISTS public.create_pending_sale(uuid, uuid, text, text, text, integer, text[], uuid, text);
CREATE FUNCTION public.create_pending_sale(
  _event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text, _buyer_email text,
  _quantity integer, _participant_names text[], _customer_id uuid DEFAULT NULL, _client_identifier text DEFAULT NULL
)
RETURNS TABLE(sale_id uuid, sale_code text, total_amount numeric, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_unit_price numeric; v_total_amount numeric; v_sale_id uuid; v_sale_code text;
  v_clean_whatsapp text; v_clean_name text; v_clean_participants text[]; v_now timestamptz:=now();
  v_attempt_count integer; v_customer_user_id uuid; v_expiration timestamptz; v_expiration_minutes integer;
BEGIN
  IF _quantity<1 OR _quantity>10 THEN RAISE EXCEPTION 'Quantidade inválida: escolha entre 1 e 10 ingressos'; END IF;
  IF array_length(_participant_names,1)!=_quantity THEN RAISE EXCEPTION 'O número de participantes informado não confere com a quantidade'; END IF;
  IF _customer_id IS NOT NULL THEN
    SELECT user_id INTO v_customer_user_id FROM public.customers WHERE id=_customer_id;
    IF v_customer_user_id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
    IF auth.uid() IS NULL OR (v_customer_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN
      RAISE EXCEPTION 'Sem permissão para associar esta venda a este cliente';
    END IF;
  END IF;
  IF _client_identifier IS NOT NULL THEN
    INSERT INTO public.checkout_rate_limits(identifier,window_start,attempt_count) VALUES(_client_identifier,v_now,1)
    ON CONFLICT(identifier) DO UPDATE
      SET attempt_count=CASE WHEN public.checkout_rate_limits.window_start<v_now-interval '10 minutes' THEN 1 ELSE public.checkout_rate_limits.attempt_count+1 END,
          window_start=CASE WHEN public.checkout_rate_limits.window_start<v_now-interval '10 minutes' THEN v_now ELSE public.checkout_rate_limits.window_start END
    RETURNING attempt_count INTO v_attempt_count;
    IF v_attempt_count>5 THEN RAISE EXCEPTION 'Muitas tentativas de compra em pouco tempo. Aguarde alguns minutos e tente novamente'; END IF;
  END IF;
  v_clean_whatsapp:=public.normalize_whatsapp(_buyer_whatsapp);
  IF v_clean_whatsapp IS NULL OR length(v_clean_whatsapp)<12 THEN RAISE EXCEPTION 'WhatsApp inválido: informe DDD + número'; END IF;
  v_clean_name:=public.format_person_name(_buyer_name);
  SELECT array_agg(public.format_person_name(p)) INTO v_clean_participants FROM unnest(_participant_names) AS p;
  SELECT b.price INTO v_unit_price
  FROM public.ticket_batches b JOIN public.events e ON e.id=b.event_id
  WHERE b.id=_batch_id AND b.event_id=_event_id AND e.status='publicado' AND NOT b.is_courtesy
    AND (b.starts_at IS NULL OR b.starts_at<=v_now) AND (b.ends_at IS NULL OR b.ends_at>=v_now)
  FOR UPDATE OF b;
  IF v_unit_price IS NULL THEN RAISE EXCEPTION 'Este lote não está disponível para venda no momento'; END IF;
  UPDATE public.ticket_batches SET quantity=quantity-_quantity WHERE id=_batch_id AND (quantity IS NULL OR quantity>=_quantity);
  IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente para este lote'; END IF;
  SELECT coalesce(o.pending_sale_expiration_minutes,30) INTO v_expiration_minutes
  FROM public.organizations o JOIN public.events e ON e.organization_id=o.id WHERE e.id=_event_id;
  v_expiration:=v_now+make_interval(mins=>coalesce(v_expiration_minutes,30));
  v_total_amount:=v_unit_price*_quantity; v_sale_code:=upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.sales(event_id,batch_id,customer_id,buyer_name,buyer_whatsapp,buyer_email,total_amount,unit_price,quantity,status,origin,payment_method,sale_code,pending_participant_names,expires_at)
  VALUES(_event_id,_batch_id,_customer_id,v_clean_name,v_clean_whatsapp,lower(trim(_buyer_email)),v_total_amount,v_unit_price,_quantity,'pendente','ticketflow','pix',v_sale_code,to_jsonb(v_clean_participants),v_expiration)
  RETURNING id INTO v_sale_id;
  RETURN QUERY SELECT v_sale_id,v_sale_code,v_total_amount,v_expiration;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.checkin_ticket(_ticket_code text)
RETURNS TABLE(ticket_id uuid,participant_name text,event_title text,batch_name text,result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_ticket record;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'colaborador') OR public.has_role(auth.uid(),'operador_checkin')) THEN
    RAISE EXCEPTION 'Sem permissão para realizar check-in';
  END IF;
  SELECT t.*,e.title AS ev_title,b.name AS b_name INTO v_ticket
  FROM public.tickets t JOIN public.sales s ON s.id=t.sale_id JOIN public.events e ON e.id=s.event_id JOIN public.ticket_batches b ON b.id=t.batch_id
  WHERE t.ticket_code=_ticket_code;
  IF v_ticket.id IS NULL THEN
    INSERT INTO public.checkin_log(ticket_code,result,checked_by) VALUES(_ticket_code,'nao_encontrado',auth.uid());
    RETURN QUERY SELECT NULL::uuid,NULL::text,NULL::text,NULL::text,'nao_encontrado'::text; RETURN;
  END IF;
  IF v_ticket.status='cancelado' THEN
    INSERT INTO public.checkin_log(ticket_id,ticket_code,result,checked_by) VALUES(v_ticket.id,_ticket_code,'cancelado',auth.uid());
    RETURN QUERY SELECT v_ticket.id,v_ticket.participant_name,v_ticket.ev_title,v_ticket.b_name,'cancelado'::text; RETURN;
  END IF;
  IF v_ticket.status='utilizado' THEN
    INSERT INTO public.checkin_log(ticket_id,ticket_code,result,checked_by) VALUES(v_ticket.id,_ticket_code,'ja_utilizado',auth.uid());
    RETURN QUERY SELECT v_ticket.id,v_ticket.participant_name,v_ticket.ev_title,v_ticket.b_name,'ja_utilizado'::text; RETURN;
  END IF;
  UPDATE public.tickets SET status='utilizado',checked_in_at=now(),checked_in_by=auth.uid() WHERE id=v_ticket.id AND status='valido';
  IF NOT FOUND THEN
    INSERT INTO public.checkin_log(ticket_id,ticket_code,result,checked_by) VALUES(v_ticket.id,_ticket_code,'ja_utilizado',auth.uid());
    RETURN QUERY SELECT v_ticket.id,v_ticket.participant_name,v_ticket.ev_title,v_ticket.b_name,'ja_utilizado'::text; RETURN;
  END IF;
  INSERT INTO public.checkin_log(ticket_id,ticket_code,result,checked_by) VALUES(v_ticket.id,_ticket_code,'sucesso',auth.uid());
  RETURN QUERY SELECT v_ticket.id,v_ticket.participant_name,v_ticket.ev_title,v_ticket.b_name,'sucesso'::text;
END;
$$;
