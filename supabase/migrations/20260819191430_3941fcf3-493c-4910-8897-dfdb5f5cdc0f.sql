
-- 1. Tabela de Rate Limiting para Checkout
CREATE TABLE IF NOT EXISTS public.checkout_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
    buyer_whatsapp text NOT NULL,
    ip_address text,
    last_attempt_at timestamptz DEFAULT now(),
    attempts_count integer DEFAULT 1,
    UNIQUE (event_id, buyer_whatsapp)
);

GRANT SELECT, INSERT, UPDATE ON public.checkout_rate_limits TO anon, authenticated;
GRANT ALL ON public.checkout_rate_limits TO service_role;

-- 2. Atualização da RPC create_pending_sale com Blindagem AAA
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
    v_clean_whatsapp text;
    v_i integer;
    v_now timestamptz := now();
    v_rate_limit record;
begin
    -- 1. Sanitização e Normalização inicial
    v_clean_whatsapp := regexp_replace(_buyer_whatsapp, '\D', '', 'g');
    if length(v_clean_whatsapp) < 10 then
        raise exception 'WhatsApp inválido';
    end if;
    
    if length(v_clean_whatsapp) = 11 or length(v_clean_whatsapp) = 10 then
        v_clean_whatsapp := '55' || v_clean_whatsapp;
    end if;

    -- 2. Rate Limiting / Idempotência (Bloqueio de 60 segundos por par WhatsApp/Evento)
    select * into v_rate_limit 
    from public.checkout_rate_limits 
    where event_id = _event_id and buyer_whatsapp = v_clean_whatsapp;

    if v_rate_limit.id is not null and v_rate_limit.last_attempt_at > v_now - interval '60 seconds' then
        raise exception 'Muitas tentativas. Aguarde 60 segundos antes de tentar novamente.';
    end if;

    insert into public.checkout_rate_limits (event_id, buyer_whatsapp, last_attempt_at, attempts_count)
    values (_event_id, v_clean_whatsapp, v_now, 1)
    on conflict (event_id, buyer_whatsapp) 
    do update set 
        last_attempt_at = v_now,
        attempts_count = checkout_rate_limits.attempts_count + 1;

    -- 3. Básicos
    if _quantity < 1 or _quantity > 10 then
        raise exception 'Quantidade inválida (1-10)';
    end if;

    if array_length(_participant_names, 1) != _quantity then
        raise exception 'Número de participantes não coincide com a quantidade';
    end if;

    -- 4. Obter dados do evento e lote com LOCK ESTRITO para evitar concorrência (Overselling)
    select 
        e.organization_id, 
        b.price
    into 
        v_org_id, 
        v_unit_price
    from public.ticket_batches b
    join public.events e on e.id = b.event_id
    where b.id = _batch_id 
      and b.event_id = _event_id
      and e.status = 'publicado'
      and not e.is_closed
      and (b.starts_at is null or b.starts_at <= v_now)
      and (b.ends_at is null or b.ends_at >= v_now)
    for update of b; -- Lock no lote

    if v_org_id is null then
        raise exception 'Evento ou lote inválido ou não disponível';
    end if;

    -- 5. Verificar e Decrementar estoque de forma atômica
    update public.ticket_batches
    set quantity = quantity - _quantity
    where id = _batch_id and quantity >= _quantity;

    if not found then
        raise exception 'Estoque insuficiente para este lote';
    end if;

    -- 6. Calcular valor real no servidor
    v_total_amount := v_unit_price * _quantity;
    v_sale_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- 7. Criar Venda
    insert into public.sales (
        organization_id, event_id, batch_id, buyer_name, buyer_whatsapp, 
        buyer_email, total_amount, unit_price, quantity, status, 
        origin, payment_method, sale_code
    )
    values (
        v_org_id, _event_id, _batch_id, trim(_buyer_name), v_clean_whatsapp, 
        lower(trim(_buyer_email)), v_total_amount, v_unit_price, _quantity, 'pendente', 
        'ticketflow', 'pix_ticketflow', v_sale_code
    )
    returning id into v_sale_id;

    -- 8. Criar Tickets
    for v_i in 1.._quantity loop
        insert into public.tickets (
            organization_id, event_id, batch_id, sale_id, 
            participant_name, ticket_code, status
        )
        values (
            v_org_id, _event_id, _batch_id, v_sale_id, 
            trim(_participant_names[v_i]), v_sale_code || '-' || v_i, 'valido'
        );
    end loop;

    -- 9. Registrar abandono inicial (convertido)
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
$$;

-- 3. Agendamento da Expiração Automática (30 min) via pg_cron (se disponível)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('expire-sales-job', '*/5 * * * *', 'SELECT public.expire_pending_sales()');
    END IF;
END $$;
