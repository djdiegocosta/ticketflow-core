CREATE OR REPLACE FUNCTION public.create_courtesy(
  _event_id uuid,
  _batch_id uuid,
  _participant_names text[],
  _customer_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(sale_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_sale_id uuid;
  v_total_qty integer;
  v_is_courtesy boolean;
  v_max_qty integer;
  v_start integer;
  v_end integer;
  v_chunk_names text[];
  v_chunk_qty integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  v_org_id := public.get_user_organization(auth.uid());
  v_total_qty := coalesce(array_length(_participant_names, 1), 0);

  if v_total_qty < 1 then
    raise exception 'Informe ao menos um participante';
  end if;

  select organization_id, is_courtesy, quantity
    into v_org_id, v_is_courtesy, v_max_qty
  from public.ticket_batches
  where id = _batch_id
    and event_id = _event_id
    and organization_id = public.get_user_organization(auth.uid())
  for update;

  if not found then
    raise exception 'Lote inválido para sua organização/evento';
  end if;

  if not v_is_courtesy then
    raise exception 'Este lote não é um lote de cortesias';
  end if;

  if v_max_qty is not null and v_max_qty < v_total_qty then
    raise exception 'Limite de cortesias deste lote atingido (restam %)', v_max_qty;
  end if;

  if v_max_qty is not null then
    update public.ticket_batches
       set quantity = quantity - v_total_qty
     where id = _batch_id;
  end if;

  -- sales.quantity possui limite máximo de 10. Para listas maiores,
  -- dividimos os participantes em vendas de até 10 e criamos os tickets
  -- de cada venda na mesma transação.
  v_start := 1;
  while v_start <= v_total_qty loop
    v_end := least(v_start + 9, v_total_qty);
    v_chunk_names := _participant_names[v_start:v_end];
    v_chunk_qty := array_length(v_chunk_names, 1);

    insert into public.sales (
      organization_id,
      event_id,
      batch_id,
      customer_id,
      sale_code,
      buyer_name,
      buyer_whatsapp,
      quantity,
      unit_price,
      total_amount,
      status,
      origin,
      is_courtesy,
      verification_type,
      created_by
    )
    values (
      v_org_id,
      _event_id,
      _batch_id,
      _customer_id,
      public.generate_short_code(),
      'Cortesia',
      '',
      v_chunk_qty,
      0,
      0,
      'pago',
      'manual',
      true,
      'manual_admin',
      auth.uid()
    )
    returning id into v_sale_id;

    perform public.create_locked_tickets(v_sale_id, to_jsonb(v_chunk_names));
    return query select v_sale_id;

    v_start := v_end + 1;
  end loop;
end;
$function$;
