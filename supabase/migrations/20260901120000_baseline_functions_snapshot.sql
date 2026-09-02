-- =============================================================================
-- BASELINE SNAPSHOT — todas as funções do schema public, capturadas ao vivo
-- Aplicado em 01/09/2026, como parte da recuperação do projeto para uso em
-- evento real.
--
-- POR QUE ESTE ARQUIVO EXISTE:
-- O histórico de migrations do banco ao vivo (Supabase) tem 15 entradas,
-- mas este repositório só tinha 13 arquivos versionados. Faltavam:
--   - 20260819191430 (3941fcf3-493c-4910-8897-dfdb5f5cdc0f)
--   - 20260826191233 (revoke_anon_execute_on_admin_functions)
--   - 20260826191259 (remove_public_execute_from_admin_security_definer_functions)
--   - 20260826195731 (harden_p0_security_definer_functions)
-- O conteúdo exato dessas migrations não é recuperável (Supabase não guarda
-- o SQL histórico, só o registro de que rodou). Em vez de tentar reconstruir
-- o histórico, este arquivo captura o ESTADO ATUAL de toda função do schema
-- public — o que importa para recuperação de desastre é o resultado, não o
-- caminho até ele.
--
-- Este snapshot já inclui duas correções aplicadas na mesma sessão:
--   1. Removidas assinaturas antigas duplicadas de create_locked_tickets,
--      create_pending_sale e update_customer (ver migration
--      drop_stale_function_overloads, mesma data) — o PostgREST estava
--      resolvendo chamadas do front-end para a versão ERRADA/desatualizada.
--   2. create_courtesy e create_manual_sale corrigidas para chamar
--      create_locked_tickets com to_jsonb() (a assinatura text[] que elas
--      usavam foi removida no item acima).
--
-- Rodar este arquivo do zero em um banco vazio não é o objetivo — ele serve
-- como referência/backup do estado real. CREATE OR REPLACE é seguro mesmo
-- assim (idempotente), mas pressupõe que as tabelas/tipos referenciados já
-- existem (migrations anteriores).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.approve_organization(_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Sem permissão';
  end if;
  update public.organizations set status = 'active', updated_at = now() where id = _org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.award_points(_customer_id uuid, _points integer, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org_id uuid;
begin
  v_org_id := public.get_user_organization(auth.uid());
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  if not exists (select 1 from public.customers where id = _customer_id and organization_id = v_org_id) then
    raise exception 'Cliente não pertence à sua organização';
  end if;
  if _points is null or _points = 0 then
    raise exception 'Quantidade de pontos inválida';
  end if;
  insert into public.points_ledger (organization_id, customer_id, points, reason)
  values (v_org_id, _customer_id, _points, _reason);
  update public.customers set points = points + _points, updated_at = now()
  where id = _customer_id and organization_id = v_org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.bootstrap_organization(_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if exists (select 1 from public.user_roles where user_id = auth.uid()) then
    raise exception 'Usuário já pertence a uma organização';
  end if;

  insert into public.organizations (name, status, plan)
  values (coalesce(nullif(trim(_name), ''), 'Minha Organização'), 'pending', 'start')
  returning id into v_org_id;

  insert into public.user_roles (user_id, organization_id, role)
  values (auth.uid(), v_org_id, 'admin');

  return v_org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_event(_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.events where id = _event_id
    and organization_id = public.get_user_organization(auth.uid()))
    or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  update public.events set status = 'cancelado', is_closed = true, closed_at = now(), updated_at = now()
  where id = _event_id;

  update public.tickets set status = 'cancelado', updated_at = now()
  where event_id = _event_id and status != 'cancelado';

  -- Vendas pagas ficam marcadas como canceladas, mas o reembolso financeiro
  -- de fato (estorno no Mercado Pago) continua sendo uma ação manual do
  -- produtor — o sistema não dispara reembolso automático aqui.
  update public.sales set status = 'cancelado', updated_at = now()
  where event_id = _event_id and status in ('pago', 'pendente');
end;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_sale(_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.sales where id = _sale_id;

  if v_org_id is null or v_org_id != public.get_user_organization(auth.uid())
     or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  update public.sales set status = 'cancelado', updated_at = now() where id = _sale_id;
  update public.tickets set status = 'cancelado', updated_at = now() where sale_id = _sale_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.change_organization_plan(_org_id uuid, _plan org_plan)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Sem permissão';
  end if;
  update public.organizations set plan = _plan, updated_at = now() where id = _org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.checkin_ticket(_ticket_code text)
 RETURNS TABLE(result text, participant_name text, event_title text, checked_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ticket record; v_updated record; v_org_id uuid; v_result text;
  v_participant text; v_event_id uuid;
begin
  v_org_id := public.get_user_organization(auth.uid());

  select t.*, e.title as event_title into v_ticket
  from public.tickets t join public.events e on e.id = t.event_id
  where t.ticket_code = _ticket_code and t.organization_id = v_org_id;

  if v_ticket is null then
    insert into public.checkin_log (organization_id, ticket_code, result, performed_by)
    values (v_org_id, _ticket_code, 'invalido', auth.uid());
    return query select 'invalido', null::text, null::text, null::timestamptz; return;
  end if;

  if v_ticket.status = 'utilizado' then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'duplicidade', auth.uid());
    return query select 'duplicidade', v_ticket.participant_name, v_ticket.event_title, v_ticket.checked_in_at; return;
  end if;

  if v_ticket.status = 'cancelado' then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'invalido', auth.uid());
    return query select 'invalido', v_ticket.participant_name, v_ticket.event_title, null::timestamptz; return;
  end if;

  update public.tickets set status = 'utilizado', checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
  where id = v_ticket.id and status = 'valido' returning * into v_updated;

  if v_updated is null then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'duplicidade', auth.uid());
    return query select 'duplicidade', v_ticket.participant_name, v_ticket.event_title, now(); return;
  end if;

  insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
  values (v_org_id, v_ticket.event_id, _ticket_code, v_updated.participant_name, 'sucesso', auth.uid());

  return query select 'sucesso', v_updated.participant_name, v_ticket.event_title, v_updated.checked_in_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_sale_paid(_sale_id uuid, _mp_payment_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE public.sales
    SET status = 'pago',
        mp_payment_id = _mp_payment_id,
        updated_at = now()
    WHERE id = _sale_id AND status = 'pendente';
END;
$function$;

-- create_courtesy: corrigida nesta sessão (to_jsonb) — ver cabeçalho do arquivo.
CREATE OR REPLACE FUNCTION public.create_courtesy(_event_id uuid, _batch_id uuid, _participant_names text[], _customer_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(sale_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_sale_id uuid;
  v_qty integer;
  v_is_courtesy boolean;
  v_max_qty integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  v_org_id := public.get_user_organization(auth.uid());
  v_qty := coalesce(array_length(_participant_names, 1), 0);
  if v_qty < 1 then raise exception 'Informe ao menos um participante'; end if;
  select organization_id, is_courtesy, quantity into v_org_id, v_is_courtesy, v_max_qty
  from public.ticket_batches where id = _batch_id and event_id = _event_id and organization_id = public.get_user_organization(auth.uid()) for update;
  if not found then raise exception 'Lote inválido para sua organização/evento'; end if;
  if not v_is_courtesy then raise exception 'Este lote não é um lote de cortesias'; end if;
  if v_max_qty is not null then
    if v_max_qty < v_qty then raise exception 'Limite de cortesias deste lote atingido (restam %)', v_max_qty; end if;
    update public.ticket_batches set quantity = quantity - v_qty where id = _batch_id;
  end if;
  insert into public.sales (organization_id,event_id,batch_id,customer_id,sale_code,buyer_name,buyer_whatsapp,quantity,unit_price,total_amount,status,origin,is_courtesy,verification_type,created_by)
  values (v_org_id,_event_id,_batch_id,_customer_id,public.generate_short_code(),'Cortesia','',v_qty,0,0,'pago','manual',true,'manual_admin',auth.uid()) returning id into v_sale_id;
  perform public.create_locked_tickets(v_sale_id, to_jsonb(_participant_names));
  return query select v_sale_id;
end;
$function$;

-- Única versão de create_locked_tickets (a versão text[] foi removida — ver
-- migration drop_stale_function_overloads, mesma data).
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
    SELECT * INTO v_sale FROM public.sales WHERE id = _sale_id;
    IF NOT FOUND THEN RETURN; END IF;

    -- Converter jsonb para array de text
    SELECT array_agg(x)::text[] INTO v_names FROM jsonb_array_elements_text(_participant_names) x;

    -- Deletar tickets pendentes se existirem (limpeza / idempotência em retry de webhook)
    DELETE FROM public.tickets WHERE sale_id = _sale_id;

    -- Criar Tickets oficiais
    FOR v_i IN 1..array_length(v_names, 1) LOOP
        INSERT INTO public.tickets (
            organization_id,
            event_id,
            batch_id,
            sale_id,
            participant_name,
            ticket_code,
            status
        )
        values (
            v_sale.organization_id,
            v_sale.event_id,
            v_sale.batch_id,
            _sale_id,
            trim(v_names[v_i]),
            v_sale.sale_code || '-' || v_i,
            'valido'
        );
    END LOOP;

    -- Limpar coluna temporária (também serve de guarda de idempotência: retry
    -- do webhook encontra pending_participant_names nulo e não reprocessa)
    UPDATE public.sales SET pending_participant_names = NULL WHERE id = _sale_id;
END;
$function$;

-- create_manual_sale: corrigida nesta sessão (to_jsonb) — ver cabeçalho do arquivo.
CREATE OR REPLACE FUNCTION public.create_manual_sale(_event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text, _quantity integer, _participant_names text[], _total_amount numeric, _payment_method payment_method, _observation text)
 RETURNS TABLE(sale_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_customer_id uuid;
  v_sale_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then raise exception 'Sem permissão'; end if;
  v_org_id := public.get_user_organization(auth.uid());
  if not exists (select 1 from public.ticket_batches where id = _batch_id and event_id = _event_id and organization_id = v_org_id) then
    raise exception 'Lote inválido para sua organização/evento';
  end if;
  if _quantity is null or _quantity < 1 then raise exception 'Quantidade inválida'; end if;
  if _total_amount is null or _total_amount < 0 then raise exception 'Valor inválido'; end if;
  insert into public.customers (organization_id,full_name,whatsapp)
  values (v_org_id,_buyer_name,_buyer_whatsapp)
  on conflict (organization_id,whatsapp) do update set full_name=excluded.full_name,updated_at=now()
  returning id into v_customer_id;
  insert into public.sales (organization_id,event_id,batch_id,customer_id,sale_code,buyer_name,buyer_whatsapp,quantity,unit_price,total_amount,status,origin,payment_method,verification_type,created_by,observation,paid_at)
  values (v_org_id,_event_id,_batch_id,v_customer_id,public.generate_short_code(),_buyer_name,_buyer_whatsapp,_quantity,_total_amount/_quantity,_total_amount,'pago','manual',_payment_method,'manual_admin',auth.uid(),_observation,now()) returning id into v_sale_id;
  perform public.create_locked_tickets(v_sale_id, to_jsonb(_participant_names));
  return query select v_sale_id;
end;
$function$;

-- Única versão de create_pending_sale (a versão de 7 argumentos, sem
-- _customer_id e sem bloqueio de lote cortesia, foi removida — ver migration
-- drop_stale_function_overloads, mesma data).
CREATE OR REPLACE FUNCTION public.create_pending_sale(_event_id uuid, _batch_id uuid, _buyer_name text, _buyer_whatsapp text, _buyer_email text, _quantity integer, _participant_names text[], _customer_id uuid DEFAULT NULL::uuid)
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

    v_total_amount := v_unit_price * _quantity;
    v_sale_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    insert into public.sales (
        organization_id, event_id, batch_id, buyer_name, buyer_whatsapp,
        buyer_email, total_amount, unit_price, quantity, status, origin,
        payment_method, sale_code, pending_participant_names, customer_id
    )
    values (
        v_org_id, _event_id, _batch_id, trim(_buyer_name), v_clean_whatsapp,
        lower(trim(_buyer_email)), v_total_amount, v_unit_price, _quantity,
        'pendente', 'ticketflow', 'pix_ticketflow', v_sale_code,
        to_jsonb(_participant_names), _customer_id
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

CREATE OR REPLACE FUNCTION public.delete_courtesy_ticket(_ticket_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_sale_id uuid;
  v_remaining integer;
begin
  if not exists (select 1 from public.tickets t join public.sales s on s.id = t.sale_id
    where t.id = _ticket_id and s.is_courtesy = true and t.status != 'utilizado'
    and t.organization_id = public.get_user_organization(auth.uid()))
    or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão ou ingresso já utilizado';
  end if;

  select sale_id into v_sale_id from public.tickets where id = _ticket_id;

  delete from public.tickets where id = _ticket_id;

  select count(*) into v_remaining from public.tickets where sale_id = v_sale_id;

  if v_remaining = 0 then
    delete from public.sales where id = v_sale_id;
  else
    update public.sales set quantity = v_remaining, updated_at = now() where id = v_sale_id;
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_customer(_customer_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (
    select 1 from public.customers
    where id = _customer_id and organization_id = public.get_user_organization(auth.uid())
  ) or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  if exists (select 1 from public.sales where customer_id = _customer_id) then
    raise exception 'Cliente possui histórico de compras — não pode ser excluído';
  end if;

  delete from public.customers where id = _customer_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_event(_event_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.events where id = _event_id
    and organization_id = public.get_user_organization(auth.uid()))
    or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  if exists (select 1 from public.sales where event_id = _event_id and status = 'pago') then
    raise exception 'Evento possui vendas pagas — não pode ser excluído';
  end if;
  delete from public.events where id = _event_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.draw_raffle_winner(_raffle_id uuid)
 RETURNS TABLE(participant_id uuid, full_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_winner record;
begin
  select organization_id into v_org_id from public.raffles where id = _raffle_id;

  if v_org_id is null or v_org_id != public.get_user_organization(auth.uid())
     or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  -- "Novo sorteio" substitui o anterior — apaga o vencedor antigo antes de sortear de novo
  delete from public.raffle_winners where raffle_id = _raffle_id;

  select id, full_name into v_winner
  from public.raffle_participants
  where raffle_id = _raffle_id
  order by random()
  limit 1;

  if v_winner is null then
    raise exception 'Nenhum participante cadastrado neste sorteio';
  end if;

  insert into public.raffle_winners (raffle_id, participant_id)
  values (_raffle_id, v_winner.id);

  return query select v_winner.id, v_winner.full_name;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_single_active_banner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.client_banners
    SET is_active = false
    WHERE organization_id = NEW.organization_id
      AND id <> NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_pending_sales()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.sales
  set status = 'expirado', updated_at = now()
  where status = 'pendente' and expires_at < now();
end;
$function$;

-- expire_pending_sales_job: wrapper usado pelo cron (ver migration
-- 20260829200330_expire_pending_sales_cron.sql). expire_pending_sales (acima)
-- parece ter ficado órfã — nada no cron nem no front-end chama a versão sem
-- "_job" hoje. Mantida por segurança, não removida nesta rodada.
CREATE OR REPLACE FUNCTION public.expire_pending_sales_job()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  UPDATE sales
  SET
    status = 'expirado',
    updated_at = NOW()
  WHERE
    status = 'pendente'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_short_code()
 RETURNS text
 LANGUAGE sql
AS $function$
  select upper(substr(md5(gen_random_uuid()::text), 1, 8))
$function$;

-- get_available_batches: é a função realmente usada pelo checkout público
-- (confirmado por grep no front-end) — cascata por esgotamento/data, exclui
-- lotes de cortesia. get_available_batches_active (abaixo) não tem nenhum
-- call site no front-end hoje — mantida por segurança, não removida.
CREATE OR REPLACE FUNCTION public.get_available_batches(_event_id uuid)
 RETURNS TABLE(id uuid, event_id uuid, organization_id uuid, name text, price numeric, quantity integer, starts_at timestamp with time zone, ends_at timestamp with time zone, is_courtesy boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH ordered AS (
    SELECT
      b.*,
      ROW_NUMBER() OVER (ORDER BY COALESCE(b.starts_at, b.created_at)) AS seq,
      ((b.quantity IS NOT NULL AND b.quantity <= 0)
        OR (b.ends_at IS NOT NULL AND b.ends_at < now())) AS exhausted
    FROM public.ticket_batches b
    WHERE b.event_id = _event_id AND NOT b.is_courtesy
  ),
  running AS (
    SELECT *,
      bool_and(exhausted) OVER (
        ORDER BY seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS all_prior_exhausted
    FROM ordered
  )
  SELECT id, event_id, organization_id, name, price, quantity, starts_at, ends_at,
         is_courtesy, created_at, updated_at
  FROM running
  WHERE (seq = 1 OR all_prior_exhausted)
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
    AND (quantity IS NULL OR quantity > 0)
  ORDER BY seq;
$function$;

-- get_available_batches_active: NÃO inclui NOT b.is_courtesy e não implementa
-- cascata — órfã (sem call site no front-end hoje). Ver nota acima.
CREATE OR REPLACE FUNCTION public.get_available_batches_active(_event_id uuid)
 RETURNS SETOF ticket_batches
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ticket_batches
  WHERE event_id = _event_id
    AND (
      starts_at IS NULL
      OR ends_at IS NULL
      OR (
        now() >= starts_at
        AND now() <= ends_at
      )
    )
  ORDER BY created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_customer_organization_design()
 RETURNS TABLE(accent_color text, corner_style text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.accent_color, o.corner_style
  FROM public.organizations o
  JOIN public.customers c ON c.organization_id = o.id
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_default_organization()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select id from public.organizations where status = 'active' order by created_at limit 1
$function$;

CREATE OR REPLACE FUNCTION public.get_hourly_sales_stats(_event_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(hour text, value integer)
 LANGUAGE sql
 STABLE
AS $function$
    SELECT
        to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"') as hour,
        count(*)::integer as value
    FROM public.sales
    WHERE
        (_event_id IS NULL OR event_id = _event_id)
        AND status = 'pago'
    GROUP BY 1
    ORDER BY 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_new_customers_count(_days integer)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
    SELECT count(*)::integer
    FROM public.customers
    WHERE created_at >= (now() - (_days || ' days')::interval);
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_customer(_organization_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_customer_id uuid;
  v_profile record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT id INTO v_customer_id
  FROM public.customers
  WHERE user_id = auth.uid() AND organization_id = _organization_id;

  IF v_customer_id IS NOT NULL THEN
    RETURN v_customer_id;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.customers (
    organization_id, user_id, full_name, whatsapp, email, cidade
  )
  VALUES (
    _organization_id,
    auth.uid(),
    COALESCE(v_profile.full_name, ''),
    COALESCE(v_profile.whatsapp, ''),
    COALESCE(v_profile.email, ''),
    v_profile.cidade
  )
  RETURNING id INTO v_customer_id;

  RETURN v_customer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_organization_design(_slug text)
 RETURNS TABLE(accent_color text, corner_style text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT o.accent_color, o.corner_style
  FROM public.organizations o
  JOIN public.events e ON e.organization_id = o.id
  WHERE e.slug = _slug AND e.status = 'publicado'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_sale_by_code(_code text)
 RETURNS TABLE(sale_id uuid, event_title text, event_date timestamp with time zone, location text, buyer_name text, quantity integer, total_amount numeric, status sale_status)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, e.title, e.event_date, e.location, s.buyer_name, s.quantity, s.total_amount, s.status
  from public.sales s
  join public.events e on e.id = s.event_id
  where s.sale_code = upper(_code)
$function$;

CREATE OR REPLACE FUNCTION public.get_single_organization_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
  v_id uuid;
BEGIN
  SELECT count(*) INTO v_count FROM public.organizations;
  IF v_count = 1 THEN
    SELECT id INTO v_id FROM public.organizations LIMIT 1;
    RETURN v_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_tickets_by_sale_code(_code text)
 RETURNS TABLE(ticket_code text, participant_name text, status ticket_status, checked_in_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select t.ticket_code, t.participant_name, t.status, t.checked_in_at
  from public.tickets t
  join public.sales s on s.id = t.sale_id
  where s.sale_code = upper(_code)
$function$;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select organization_id from public.user_roles where user_id = _user_id limit 1
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_invite record;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);

  select * into v_invite from public.pending_invites where email = new.email limit 1;
  if v_invite is not null then
    insert into public.user_roles (user_id, organization_id, role)
    values (new.id, v_invite.organization_id, v_invite.role);
    delete from public.pending_invites where id = v_invite.id;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.invite_user(_email text, _role app_role)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_existing_user_id uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  v_org_id := public.get_user_organization(auth.uid());

  select id into v_existing_user_id from auth.users where email = _email;

  if v_existing_user_id is not null then
    insert into public.user_roles (user_id, organization_id, role)
    values (v_existing_user_id, v_org_id, _role)
    on conflict (user_id, organization_id) do update set role = excluded.role;
    return 'ativo';
  else
    insert into public.pending_invites (organization_id, email, role, invited_by)
    values (v_org_id, _email, _role, auth.uid())
    on conflict (organization_id, email) do update set role = excluded.role;
    return 'pendente';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.platform_admins where user_id = _user_id)
$function$;

CREATE OR REPLACE FUNCTION public.refund_sale(_sale_id uuid, _refund_amount numeric, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.sales where id = _sale_id
    and organization_id = public.get_user_organization(auth.uid()))
    or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  update public.sales set status = 'reembolsado', refunded_amount = _refund_amount,
    refund_reason = _reason, refunded_at = now(), updated_at = now() where id = _sale_id;
  update public.tickets set status = 'cancelado', updated_at = now() where sale_id = _sale_id;
end; $function$;

CREATE OR REPLACE FUNCTION public.signup_customer(_full_name text, _whatsapp text, _email text, _cidade text)
 RETURNS TABLE(customer_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org_id uuid; v_customer_id uuid;
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  v_org_id := public.get_default_organization();
  insert into public.customers (organization_id, user_id, full_name, whatsapp, email, cidade, account_created_at)
  values (v_org_id, auth.uid(), _full_name, _whatsapp, _email, _cidade, now())
  on conflict (organization_id, whatsapp) do update
    set user_id = auth.uid(), full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        cidade = coalesce(excluded.cidade, public.customers.cidade),
        account_created_at = coalesce(public.customers.account_created_at, now()),
        updated_at = now()
  returning id into v_customer_id;
  return query select v_customer_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.suspend_organization(_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_platform_admin(auth.uid()) then
    raise exception 'Sem permissão';
  end if;
  update public.organizations set status = 'suspended', updated_at = now() where id = _org_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.track_checkout_abandonment(_event_id uuid, _buyer_name text, _buyer_whatsapp text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_org_id uuid;
    v_clean_whatsapp text;
begin
    select organization_id into v_org_id from public.events where id = _event_id;

    v_clean_whatsapp := regexp_replace(_buyer_whatsapp, '\D', '', 'g');
    if length(v_clean_whatsapp) = 11 or length(v_clean_whatsapp) = 10 then
        v_clean_whatsapp := '55' || v_clean_whatsapp;
    end if;

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
        'sem_pix',
        'nao_contactado'
    )
    on conflict (event_id, buyer_whatsapp)
    do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_courtesy_participant(_ticket_id uuid, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.tickets t join public.sales s on s.id = t.sale_id
    where t.id = _ticket_id and s.is_courtesy = true
    and t.organization_id = public.get_user_organization(auth.uid()))
    or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;
  update public.tickets set participant_name = _name, updated_at = now() where id = _ticket_id;
end; $function$;

-- Única versão de update_customer (a versão de 7 argumentos, admin-only e
-- sem coalesce, foi removida — ver migration drop_stale_function_overloads,
-- mesma data).
CREATE OR REPLACE FUNCTION public.update_customer(_customer_id uuid, _full_name text, _whatsapp text, _email text, _cidade text DEFAULT NULL::text, _data_nascimento date DEFAULT NULL::date, _instagram text DEFAULT NULL::text, _sexo customer_gender DEFAULT NULL::customer_gender)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_user_id uuid;
  v_org_id uuid;
begin
  select user_id, organization_id into v_owner_user_id, v_org_id
  from public.customers
  where id = _customer_id;

  if v_owner_user_id is null then
    raise exception 'Cliente não encontrado';
  end if;

  if v_owner_user_id is distinct from auth.uid()
     and not (public.has_role(auth.uid(), 'admin') and v_org_id = public.get_user_organization(auth.uid())) then
    raise exception 'Sem permissão para editar este cliente';
  end if;

  update public.customers
  set full_name = _full_name,
      whatsapp = _whatsapp,
      email = _email,
      cidade = coalesce(_cidade, cidade),
      data_nascimento = coalesce(_data_nascimento, data_nascimento),
      instagram = coalesce(_instagram, instagram),
      sexo = coalesce(_sexo, sexo),
      updated_at = now()
  where id = _customer_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_organization_profile(_org_id uuid, _name text, _logo_url text, _contact_email text, _contact_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not (public.has_role(auth.uid(), 'admin') and public.get_user_organization(auth.uid()) = _org_id) then
    raise exception 'Sem permissão';
  end if;

  update public.organizations
  set name = _name, logo_url = _logo_url, contact_email = _contact_email,
      contact_phone = _contact_phone, updated_at = now()
  where id = _org_id;
end;
$function$;
