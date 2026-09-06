-- (Completa a migration 20260906114656 do ChatGPT: adiciona REVOKE/GRANT nela
-- ausentes, e versiona confirm_sale_paid, create_locked_tickets e
-- create_pending_sale, que ja rodavam em producao sem nenhuma migration.

-- Reconciliação AUD-005: o subsistema de expiração de vendas pendentes
-- (restauração de estoque, expires_at no retorno de create_pending_sale,
-- confirm_sale_paid respeitando expiração) já está funcionando corretamente
-- em produção, mas nenhuma migration versionada captura essas versões.
-- A última versão versionada de cada função (baseline de 01/09 e
-- add_operational_preferences de 03/09) é mais antiga que a que roda hoje:
-- não restaura estoque na expiração e não retorna expires_at para o
-- checkout sincronizar o timer.
-- Esta migration é idempotente: recria cada função com a definição real
-- e funcional de produção, sem alterar nenhum comportamento.

-- confirm_sale_paid: só confirma pagamento de venda pendente ainda não expirada.
CREATE OR REPLACE FUNCTION public.confirm_sale_paid(_sale_id uuid, _mp_payment_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changed integer;
BEGIN
  UPDATE public.sales
  SET status = 'pago', mp_payment_id = _mp_payment_id, updated_at = now()
  WHERE id = _sale_id
    AND status = 'pendente'
    AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_sale_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;

-- create_locked_tickets: cria ingressos de forma idempotente (não duplica em reprocessamento).
CREATE OR REPLACE FUNCTION public.create_locked_tickets(_sale_id uuid, _participant_names jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
  v_i integer;
  v_names text[];
BEGIN
  SELECT * INTO v_sale FROM public.sales WHERE id = _sale_id AND status = 'pago';
  IF NOT FOUND THEN RETURN; END IF;

  SELECT array_agg(x)::text[] INTO v_names FROM jsonb_array_elements_text(_participant_names) x;
  IF v_names IS NULL OR array_length(v_names, 1) IS NULL THEN RETURN; END IF;

  FOR v_i IN 1..array_length(v_names, 1) LOOP
    INSERT INTO public.tickets (organization_id, event_id, batch_id, sale_id, participant_name, ticket_code, status)
    SELECT v_sale.organization_id, v_sale.event_id, v_sale.batch_id, _sale_id, trim(v_names[v_i]), v_sale.sale_code || '-' || v_i, 'valido'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tickets t WHERE t.sale_id = _sale_id AND t.ticket_code = v_sale.sale_code || '-' || v_i
    );
  END LOOP;

  UPDATE public.sales SET pending_participant_names = NULL WHERE id = _sale_id AND pending_participant_names IS NOT NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.create_locked_tickets(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) TO service_role;

-- create_pending_sale: agora retorna expires_at (usado pelo checkout para sincronizar o timer).
CREATE OR REPLACE FUNCTION public.create_pending_sale(_event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text, _buyer_email text, _quantity integer, _participant_names text[], _customer_id uuid DEFAULT NULL::uuid, _ref_code text DEFAULT NULL::text)
 RETURNS TABLE(sale_id uuid, sale_code text, total_amount numeric, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid; v_unit_price numeric; v_total_amount numeric; v_sale_id uuid; v_sale_code text; v_batch_name text; v_clean_whatsapp text; v_sales_link_id uuid; v_now timestamptz := now(); v_expiration_minutes integer;
begin
  if _quantity < 1 or _quantity > 10 then raise exception 'Quantidade inválida (1-10)'; end if;
  if array_length(_participant_names, 1) != _quantity then raise exception 'Número de participantes não coincide com a quantidade'; end if;
  v_clean_whatsapp := regexp_replace(_buyer_whatsapp, '\D', '', 'g');
  if length(v_clean_whatsapp) < 10 then raise exception 'WhatsApp inválido'; end if;
  if length(v_clean_whatsapp) in (10, 11) then v_clean_whatsapp := '55' || v_clean_whatsapp; end if;
  select e.organization_id, b.price, b.name into v_org_id, v_unit_price, v_batch_name
  from public.events e join public.ticket_batches b on b.event_id = e.id
  where e.id = _event_id and b.id = _batch_id and e.status = 'publicado' and not e.is_closed and not b.is_courtesy
    and (b.starts_at is null or b.starts_at <= v_now) and (b.ends_at is null or b.ends_at >= v_now) for update of b;
  if v_org_id is null then raise exception 'Evento ou lote inválido ou não disponível'; end if;
  select pending_sale_expiration_minutes into v_expiration_minutes from public.organizations where id = v_org_id;
  v_expiration_minutes := coalesce(v_expiration_minutes, 30);
  update public.ticket_batches set quantity = quantity - _quantity where id = _batch_id and quantity >= _quantity;
  if not found then raise exception 'Estoque insuficiente para este lote'; end if;
  if _ref_code is not null and length(trim(_ref_code)) > 0 then
    select id into v_sales_link_id from public.sales_links where event_id = _event_id and code = lower(trim(_ref_code)) and is_active = true limit 1;
  end if;
  v_total_amount := v_unit_price * _quantity;
  v_sale_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.sales (organization_id,event_id,batch_id,buyer_name,buyer_whatsapp,buyer_email,total_amount,unit_price,quantity,status,origin,payment_method,sale_code,pending_participant_names,customer_id,sales_link_id,expires_at)
  values (v_org_id,_event_id,_batch_id,trim(_buyer_name),v_clean_whatsapp,lower(trim(_buyer_email)),v_total_amount,v_unit_price,_quantity,'pendente','ticketflow','pix_ticketflow',v_sale_code,to_jsonb(_participant_names),_customer_id,v_sales_link_id,v_now + make_interval(mins => v_expiration_minutes)) returning id into v_sale_id;
  insert into public.checkout_abandonments (organization_id,event_id,buyer_name,buyer_whatsapp,abandonment_type,status) values (v_org_id,_event_id,trim(_buyer_name),v_clean_whatsapp,'pix_nao_pago','convertido') on conflict (event_id,buyer_whatsapp) do update set status = 'convertido' where checkout_abandonments.status = 'nao_contactado';
  return query select v_sale_id,v_sale_code,v_total_amount,v_now + make_interval(mins => v_expiration_minutes);
end;
$function$;
REVOKE ALL ON FUNCTION public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pending_sale(uuid,uuid,text,text,text,integer,text[],uuid,text) TO anon, authenticated, service_role;

-- expire_pending_sales_job: agora restaura o estoque do lote ao expirar a venda pendente.
CREATE INDEX IF NOT EXISTS sales_pending_expires_idx ON public.sales(status, expires_at) WHERE status = 'pendente';

CREATE OR REPLACE FUNCTION public.expire_pending_sales_job()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
BEGIN
  FOR v_sale IN
    SELECT id, batch_id, quantity
    FROM public.sales
    WHERE status = 'pendente'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    ORDER BY expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.ticket_batches
    SET quantity = quantity + v_sale.quantity
    WHERE id = v_sale.batch_id
      AND quantity IS NOT NULL;

    UPDATE public.sales
    SET status = 'expirado', updated_at = now()
    WHERE id = v_sale.id
      AND status = 'pendente';
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.expire_pending_sales_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales_job() TO service_role;

CREATE OR REPLACE FUNCTION public.expire_pending_sales()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.expire_pending_sales_job();
END;
$function$;
REVOKE ALL ON FUNCTION public.expire_pending_sales() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales() TO service_role;
