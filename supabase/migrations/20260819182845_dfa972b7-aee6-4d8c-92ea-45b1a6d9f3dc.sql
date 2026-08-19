
-- Correção da RPC create_pending_sale para incluir unit_price
CREATE OR REPLACE FUNCTION public.create_pending_sale(
    _event_id uuid,
    _batch_id uuid,
    _buyer_name text,
    _buyer_whatsapp text,
    _buyer_email text,
    _quantity integer,
    _participant_names text[]
)
RETURNS TABLE (
    sale_id uuid,
    sale_code text,
    total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
    v_org_id uuid;
    v_unit_price numeric;
    v_total_amount numeric;
    v_sale_id uuid;
    v_sale_code text;
    v_batch_name text;
    v_clean_whatsapp text;
    v_i integer;
    v_now timestamptz := now();
begin
    -- 1. Básicos
    if _quantity < 1 or _quantity > 10 then
        raise exception 'Quantidade inválida (1-10)';
    end if;

    if array_length(_participant_names, 1) != _quantity then
        raise exception 'Número de participantes não coincide com a quantidade';
    end if;

    -- 2. Sanitização e Normalização
    v_clean_whatsapp := regexp_replace(_buyer_whatsapp, '\D', '', 'g');
    if length(v_clean_whatsapp) < 10 then
        raise exception 'WhatsApp inválido';
    end if;
    
    -- Normalizar para 13 dígitos com prefixo 55
    if length(v_clean_whatsapp) = 11 then
        v_clean_whatsapp := '55' || v_clean_whatsapp;
    elsif length(v_clean_whatsapp) = 10 then
        v_clean_whatsapp := '55' || v_clean_whatsapp;
    end if;

    -- 3. Obter dados do evento e lote com LOCK de linha no lote para evitar concorrência
    select 
        e.organization_id, 
        b.price,
        b.name
    into 
        v_org_id, 
        v_unit_price,
        v_batch_name
    from public.events e
    join public.ticket_batches b on b.event_id = e.id
    where e.id = _event_id 
      and b.id = _batch_id
      and e.status = 'publicado'
      and not e.is_closed
      and (b.starts_at is null or b.starts_at <= v_now)
      and (b.ends_at is null or b.ends_at >= v_now)
    for update of b; -- Lock no lote

    if v_org_id is null then
        raise exception 'Evento ou lote inválido ou não disponível';
    end if;

    -- 4. Verificar estoque de forma atômica
    update public.ticket_batches
    set quantity = quantity - _quantity
    where id = _batch_id and quantity >= _quantity;

    if not found then
        raise exception 'Estoque insuficiente para este lote';
    end if;

    -- 5. Calcular valor real no servidor
    v_total_amount := v_unit_price * _quantity;
    v_sale_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- 6. Criar Venda
    insert into public.sales (
        organization_id,
        event_id,
        batch_id,
        buyer_name,
        buyer_whatsapp,
        buyer_email,
        total_amount,
        unit_price, -- Adicionado campo obrigatório
        quantity,
        status,
        origin,
        payment_method,
        sale_code
    )
    values (
        v_org_id,
        _event_id,
        _batch_id,
        trim(_buyer_name),
        v_clean_whatsapp,
        lower(trim(_buyer_email)),
        v_total_amount,
        v_unit_price, -- Valor unitário real
        _quantity,
        'pendente',
        'ticketflow',
        'pix_ticketflow',
        v_sale_code
    )
    returning id into v_sale_id;

    -- 7. Criar Tickets
    for v_i in 1.._quantity loop
        insert into public.tickets (
            organization_id,
            event_id,
            sale_id,
            participant_name,
            ticket_code,
            status
        )
        values (
            v_org_id,
            _event_id,
            v_sale_id,
            trim(_participant_names[v_i]),
            v_sale_code || '-' || v_i,
            'valido'
        );
    end loop;

    -- 8. Registrar abandono inicial (convertido)
    insert into public.checkout_abandonments (
        organization_id,
        event_id,
        buyer_name,
        buyer_whatsapp,
        abandonment_type,
        status
    )
    values (
        v_org_id,
        _event_id,
        trim(_buyer_name),
        v_clean_whatsapp,
        'pix_nao_pago',
        'convertido'
    )
    on conflict (event_id, buyer_whatsapp)
    do update set status = 'convertido'
    where checkout_abandonments.status = 'nao_contactado';

    return query select v_sale_id, v_sale_code, v_total_amount;
end;
$$;
