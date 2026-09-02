-- 1) Tabela sales_links
CREATE TABLE public.sales_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'outro',
  code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_links TO authenticated;
GRANT ALL ON public.sales_links TO service_role;

ALTER TABLE public.sales_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins gerenciam links da própria organização"
ON public.sales_links FOR ALL TO authenticated
USING (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (organization_id = public.get_user_organization(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_sales_links_updated_at
BEFORE UPDATE ON public.sales_links
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2) Coluna em sales
ALTER TABLE public.sales ADD COLUMN sales_link_id uuid REFERENCES public.sales_links(id) ON DELETE SET NULL;
CREATE INDEX idx_sales_sales_link_id ON public.sales(sales_link_id);

-- 3) create_pending_sale (+ _ref_code)
DROP FUNCTION IF EXISTS public.create_pending_sale(uuid, uuid, text, text, text, integer, text[], uuid);

CREATE OR REPLACE FUNCTION public.create_pending_sale(
  _event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text,
  _buyer_email text, _quantity integer, _participant_names text[],
  _customer_id uuid DEFAULT NULL::uuid, _ref_code text DEFAULT NULL::text
)
RETURNS TABLE(sale_id uuid, sale_code text, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
    v_org_id uuid;
    v_unit_price numeric;
    v_total_amount numeric;
    v_sale_id uuid;
    v_sale_code text;
    v_batch_name text;
    v_clean_whatsapp text;
    v_sales_link_id uuid;
    v_now timestamptz := now();
begin
    if _quantity < 1 or _quantity > 10 then
        raise exception 'Quantidade inválida (1-10)';
    end if;

    if array_length(_participant_names, 1) != _quantity then
        raise exception 'Número de participantes não coincide com a quantidade';
    end if;

    v_clean_whatsapp := regexp_replace(_buyer_whatsapp, '\D', '', 'g');
    if length(v_clean_whatsapp) < 10 then
        raise exception 'WhatsApp inválido';
    end if;

    if length(v_clean_whatsapp) in (10, 11) then
        v_clean_whatsapp := '55' || v_clean_whatsapp;
    end if;

    select e.organization_id, b.price, b.name
    into v_org_id, v_unit_price, v_batch_name
    from public.events e
    join public.ticket_batches b on b.event_id = e.id
    where e.id = _event_id
      and b.id = _batch_id
      and e.status = 'publicado'
      and not e.is_closed
      and not b.is_courtesy
      and (b.starts_at is null or b.starts_at <= v_now)
      and (b.ends_at is null or b.ends_at >= v_now)
    for update of b;

    if v_org_id is null then
        raise exception 'Evento ou lote inválido ou não disponível';
    end if;

    update public.ticket_batches
    set quantity = quantity - _quantity
    where id = _batch_id and quantity >= _quantity;

    if not found then
        raise exception 'Estoque insuficiente para este lote';
    end if;

    -- Atribuição de canal: nunca bloqueia a compra
    if _ref_code is not null and length(trim(_ref_code)) > 0 then
      select id into v_sales_link_id
      from public.sales_links
      where event_id = _event_id
        and code = lower(trim(_ref_code))
        and is_active = true
      limit 1;
    end if;

    v_total_amount := v_unit_price * _quantity;
    v_sale_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    insert into public.sales (
        organization_id, event_id, batch_id, buyer_name, buyer_whatsapp,
        buyer_email, total_amount, unit_price, quantity, status, origin,
        payment_method, sale_code, pending_participant_names, customer_id,
        sales_link_id
    )
    values (
        v_org_id, _event_id, _batch_id, trim(_buyer_name), v_clean_whatsapp,
        lower(trim(_buyer_email)), v_total_amount, v_unit_price, _quantity,
        'pendente', 'ticketflow', 'pix_ticketflow', v_sale_code,
        to_jsonb(_participant_names), _customer_id, v_sales_link_id
    )
    returning id into v_sale_id;

    insert into public.checkout_abandonments (
        organization_id, event_id, buyer_name, buyer_whatsapp,
        abandonment_type, status
    )
    values (
        v_org_id, _event_id, trim(_buyer_name), v_clean_whatsapp,
        'pix_nao_pago', 'convertido'
    )
    on conflict (event_id, buyer_whatsapp)
    do update set status = 'convertido'
    where checkout_abandonments.status = 'nao_contactado';

    return query select v_sale_id, v_sale_code, v_total_amount;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_pending_sale(uuid, uuid, text, text, text, integer, text[], uuid, text) TO anon, authenticated, service_role;

-- 4) create_manual_sale (+ _sales_link_id)
DROP FUNCTION IF EXISTS public.create_manual_sale(uuid, uuid, text, text, integer, text[], numeric, payment_method, text);

CREATE OR REPLACE FUNCTION public.create_manual_sale(
  _event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text,
  _quantity integer, _participant_names text[], _total_amount numeric,
  _payment_method payment_method, _observation text,
  _sales_link_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(sale_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_customer_id uuid;
  v_sale_id uuid;
  v_link_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Sem permissão'; end if;
  v_org_id := public.get_user_organization(auth.uid());
  if not exists (select 1 from public.ticket_batches where id = _batch_id and event_id = _event_id and organization_id = v_org_id) then
    raise exception 'Lote inválido para sua organização/evento';
  end if;
  if _quantity is null or _quantity < 1 then raise exception 'Quantidade inválida'; end if;
  if _total_amount is null or _total_amount < 0 then raise exception 'Valor inválido'; end if;

  if _sales_link_id is not null then
    select id into v_link_id from public.sales_links
    where id = _sales_link_id and event_id = _event_id and organization_id = v_org_id;
    if v_link_id is null then raise exception 'Link de venda inválido para este evento'; end if;
  end if;

  insert into public.customers (organization_id,full_name,whatsapp)
  values (v_org_id,_buyer_name,_buyer_whatsapp)
  on conflict (organization_id,whatsapp) do update set full_name=excluded.full_name,updated_at=now()
  returning id into v_customer_id;
  insert into public.sales (organization_id,event_id,batch_id,customer_id,sale_code,buyer_name,buyer_whatsapp,quantity,unit_price,total_amount,status,origin,payment_method,verification_type,created_by,observation,paid_at,sales_link_id)
  values (v_org_id,_event_id,_batch_id,v_customer_id,public.generate_short_code(),_buyer_name,_buyer_whatsapp,_quantity,_total_amount/_quantity,_total_amount,'pago','manual',_payment_method,'manual_admin',auth.uid(),_observation,now(),v_link_id) returning id into v_sale_id;
  perform public.create_locked_tickets(v_sale_id, to_jsonb(_participant_names));
  return query select v_sale_id;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.create_manual_sale(uuid, uuid, text, text, integer, text[], numeric, payment_method, text, uuid) TO authenticated, service_role;

-- 5) Stats
CREATE OR REPLACE FUNCTION public.get_sales_link_stats(_event_id uuid)
RETURNS TABLE(sales_link_id uuid, name text, channel text, code text, is_active boolean, sales_count integer, revenue numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select l.id, l.name, l.channel, l.code, l.is_active,
         coalesce(count(s.id) filter (where s.status = 'pago'), 0)::integer,
         coalesce(sum(s.total_amount) filter (where s.status = 'pago'), 0)::numeric
  from public.sales_links l
  left join public.sales s on s.sales_link_id = l.id
  where l.event_id = _event_id
    and l.organization_id = public.get_user_organization(auth.uid())
  group by l.id, l.name, l.channel, l.code, l.is_active, l.created_at
  order by l.created_at;
$function$;

GRANT EXECUTE ON FUNCTION public.get_sales_link_stats(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_direct_sales_stats(_event_id uuid)
RETURNS TABLE(sales_count integer, revenue numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select coalesce(count(s.id), 0)::integer,
         coalesce(sum(s.total_amount), 0)::numeric
  from public.sales s
  where s.event_id = _event_id
    and s.sales_link_id is null
    and s.status = 'pago'
    and s.organization_id = public.get_user_organization(auth.uid());
$function$;

GRANT EXECUTE ON FUNCTION public.get_direct_sales_stats(uuid) TO authenticated, service_role;