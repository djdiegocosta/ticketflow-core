-- Consolidated production hardening for payment confirmation and pending-sale expiration.

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DROP FUNCTION IF EXISTS public.confirm_sale_paid(uuid,text);
CREATE FUNCTION public.confirm_sale_paid(_sale_id uuid,_mp_payment_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE changed integer;
BEGIN
  UPDATE public.sales
  SET status='pago',mp_payment_id=_mp_payment_id,verification_type='webhook_hmac',updated_at=now()
  WHERE id=_sale_id AND status='pendente' AND (expires_at IS NULL OR expires_at>now());
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed>0;
END;
$$;
REVOKE ALL ON FUNCTION public.confirm_sale_paid(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.create_locked_tickets(_sale_id uuid,_participant_names jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_sale record; v_i integer; v_names text[]; v_ticket_code text;
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id=_sale_id AND status='pago';
  IF NOT FOUND THEN RETURN; END IF;
  SELECT array_agg(x)::text[] INTO v_names FROM jsonb_array_elements_text(_participant_names) x;
  IF v_names IS NULL OR array_length(v_names,1) IS NULL THEN RETURN; END IF;
  FOR v_i IN 1..array_length(v_names,1) LOOP
    v_ticket_code:=v_sale.sale_code||'-'||v_i;
    INSERT INTO public.tickets(organization_id,event_id,batch_id,sale_id,participant_name,ticket_code,status)
    SELECT v_sale.organization_id,v_sale.event_id,v_sale.batch_id,_sale_id,trim(v_names[v_i]),v_ticket_code,'valido'
    WHERE NOT EXISTS(SELECT 1 FROM public.tickets t WHERE t.sale_id=_sale_id AND t.ticket_code=v_ticket_code);
  END LOOP;
  UPDATE public.sales SET pending_participant_names=NULL WHERE id=_sale_id AND pending_participant_names IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.create_locked_tickets(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid,jsonb) TO service_role;

DROP FUNCTION IF EXISTS public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text);
CREATE FUNCTION public.create_pending_sale(_event_id uuid,_batch_id uuid,_buyer_name text,_buyer_whatsapp text,_buyer_email text,_quantity integer,_participant_names text[],_customer_id uuid DEFAULT NULL,_ref_code text DEFAULT NULL)
RETURNS TABLE(sale_id uuid,sale_code text,total_amount numeric,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_org_id uuid; v_unit_price numeric; v_total_amount numeric; v_sale_id uuid; v_sale_code text; v_clean_whatsapp text; v_clean_name text; v_clean_participants text[]; v_now timestamptz:=now(); v_attempt_count integer; v_customer_user_id uuid; v_expiration timestamptz; v_expiration_minutes integer; v_rate_identifier text;
BEGIN
  IF _quantity<1 OR _quantity>10 THEN RAISE EXCEPTION 'Quantidade inválida: escolha entre 1 e 10 ingressos'; END IF;
  IF array_length(_participant_names,1)!=_quantity THEN RAISE EXCEPTION 'O número de participantes informado não confere com a quantidade'; END IF;
  v_clean_whatsapp:=public.normalize_whatsapp(_buyer_whatsapp);
  IF v_clean_whatsapp IS NULL OR length(v_clean_whatsapp)<12 THEN RAISE EXCEPTION 'WhatsApp inválido: informe DDD + número'; END IF;
  IF _customer_id IS NOT NULL THEN
    SELECT user_id INTO v_customer_user_id FROM public.customers WHERE id=_customer_id;
    IF v_customer_user_id IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
    IF auth.uid() IS NULL OR (v_customer_user_id IS DISTINCT FROM auth.uid() AND NOT public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Sem permissão para associar esta venda a este cliente'; END IF;
  END IF;
  v_rate_identifier:=coalesce(auth.uid()::text,v_clean_whatsapp);
  INSERT INTO public.checkout_rate_limits(identifier,window_start,attempt_count) VALUES(v_rate_identifier,v_now,1)
  ON CONFLICT(identifier) DO UPDATE SET attempt_count=CASE WHEN public.checkout_rate_limits.window_start<v_now-interval '10 minutes' THEN 1 ELSE public.checkout_rate_limits.attempt_count+1 END,window_start=CASE WHEN public.checkout_rate_limits.window_start<v_now-interval '10 minutes' THEN v_now ELSE public.checkout_rate_limits.window_start END
  RETURNING attempt_count INTO v_attempt_count;
  IF v_attempt_count>5 THEN RAISE EXCEPTION 'Muitas tentativas de compra em pouco tempo. Aguarde alguns minutos e tente novamente'; END IF;
  v_clean_name:=public.format_person_name(_buyer_name);
  SELECT array_agg(public.format_person_name(p)) INTO v_clean_participants FROM unnest(_participant_names) AS p;
  SELECT e.organization_id,b.price INTO v_org_id,v_unit_price FROM public.events e JOIN public.ticket_batches b ON b.event_id=e.id WHERE e.id=_event_id AND b.id=_batch_id AND e.status='publicado' AND NOT e.is_closed AND NOT b.is_courtesy AND (b.starts_at IS NULL OR b.starts_at<=v_now) AND (b.ends_at IS NULL OR b.ends_at>=v_now) FOR UPDATE OF b;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'Evento ou lote inválido ou não disponível'; END IF;
  UPDATE public.ticket_batches SET quantity=quantity-_quantity WHERE id=_batch_id AND (quantity IS NULL OR quantity>=_quantity);
  IF NOT FOUND THEN RAISE EXCEPTION 'Estoque insuficiente para este lote'; END IF;
  SELECT coalesce(o.pending_sale_expiration_minutes,30) INTO v_expiration_minutes FROM public.organizations o WHERE o.id=v_org_id;
  v_expiration:=v_now+make_interval(mins=>coalesce(v_expiration_minutes,30));
  v_total_amount:=v_unit_price*_quantity;
  v_sale_code:=upper(substring(replace(gen_random_uuid()::text,'-',''),1,8));
  INSERT INTO public.sales(organization_id,event_id,batch_id,buyer_name,buyer_whatsapp,buyer_email,total_amount,unit_price,quantity,status,origin,payment_method,sale_code,pending_participant_names,customer_id,expires_at)
  VALUES(v_org_id,_event_id,_batch_id,v_clean_name,v_clean_whatsapp,lower(trim(_buyer_email)),v_total_amount,v_unit_price,_quantity,'pendente','ticketflow','pix_ticketflow',v_sale_code,to_jsonb(v_clean_participants),_customer_id,v_expiration)
  RETURNING id INTO v_sale_id;
  RETURN QUERY SELECT v_sale_id,v_sale_code,v_total_amount,v_expiration;
END;
$$;
REVOKE ALL ON FUNCTION public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text) TO anon,authenticated,service_role;

CREATE INDEX IF NOT EXISTS sales_pending_expires_idx ON public.sales(status,expires_at) WHERE status='pendente';
DROP FUNCTION IF EXISTS public.expire_pending_sales_job();
CREATE FUNCTION public.expire_pending_sales_job() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_sale record;
BEGIN
  FOR v_sale IN SELECT id,batch_id,quantity FROM public.sales WHERE status='pendente' AND expires_at IS NOT NULL AND expires_at<=now() ORDER BY expires_at FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.ticket_batches SET quantity=quantity+v_sale.quantity WHERE id=v_sale.batch_id AND quantity IS NOT NULL;
    UPDATE public.sales SET status='expirado',updated_at=now() WHERE id=v_sale.id AND status='pendente';
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_pending_sales_job() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales_job() TO service_role;
DROP FUNCTION IF EXISTS public.expire_pending_sales();
CREATE FUNCTION public.expire_pending_sales() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ BEGIN PERFORM public.expire_pending_sales_job(); END; $$;
REVOKE ALL ON FUNCTION public.expire_pending_sales() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales() TO service_role;
