-- Regra "compra sem cadastro": quando desligada, só quem está logado compra.
-- Padrão ligado = comportamento atual (qualquer pessoa compra sem conta).

alter table public.organizations
  add column if not exists allow_guest_checkout boolean not null default true;

-- Leitura pública mínima (só um sim/não) para o checkout saber se exige conta.
create or replace function public.is_guest_checkout_allowed(_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select o.allow_guest_checkout
       from public.events e
       join public.organizations o on o.id = e.organization_id
      where e.id = _event_id and e.status = 'publicado' and not e.is_closed),
    true
  );
$$;

revoke all on function public.is_guest_checkout_allowed(uuid) from public;
grant execute on function public.is_guest_checkout_allowed(uuid) to anon, authenticated, service_role;

-- Trava no servidor: mesmo que alguém burle a tela, a venda é recusada.
create or replace function public.create_pending_sale(_event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text, _buyer_email text, _quantity integer, _participant_names text[], _customer_id uuid DEFAULT NULL::uuid, _ref_code text DEFAULT NULL::text)
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
  if auth.uid() is null
     and not coalesce((select o.allow_guest_checkout from public.organizations o where o.id = v_org_id), true) then
    raise exception 'Para comprar neste evento é preciso entrar na sua conta.';
  end if;
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
