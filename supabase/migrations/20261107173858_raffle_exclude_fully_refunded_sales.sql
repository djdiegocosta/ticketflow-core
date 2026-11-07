-- Exclui vendas integralmente reembolsadas dos públicos de compradores e de check-in.
CREATE OR REPLACE FUNCTION public.create_raffle(_title text, _source text, _event_id uuid, _period_start date, _period_end date, _entry_mode text, _prizes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_raffle_id uuid;
  v_entry_count integer := 0;
  v_participant_count integer := 0;
  v_event_title text;
begin
  if v_user_id is null or not public.has_role(v_user_id, 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_org_id := public.get_user_organization(v_user_id);
  if v_org_id is null then
    raise exception 'Organização não identificada';
  end if;

  if _title is null or length(btrim(_title)) = 0 or length(btrim(_title)) > 120 then
    raise exception 'Informe um nome para o sorteio (até 120 caracteres)';
  end if;

  if _source not in (
    'clientes_cadastrados', 'compradores_evento', 'checkins_evento',
    'compradores_periodo', 'clientes_recorrentes'
  ) then
    raise exception 'Critério de participantes inválido';
  end if;

  if _entry_mode not in ('pessoa', 'ingresso') then
    raise exception 'Modo de participação inválido';
  end if;

  if _source = 'clientes_cadastrados' and _entry_mode <> 'pessoa' then
    raise exception 'Clientes cadastrados participam uma vez por conta';
  end if;

  if (_period_start is null) <> (_period_end is null) then
    raise exception 'Informe as duas datas do período ou deixe ambas vazias';
  end if;
  if _period_start is not null and _period_end < _period_start then
    raise exception 'O período informado é inválido';
  end if;

  if _prizes is null or cardinality(_prizes) < 1 or cardinality(_prizes) > 30
    or exists (
      select 1 from unnest(_prizes) p
      where length(btrim(p)) = 0 or length(btrim(p)) > 160
    ) then
    raise exception 'Informe de 1 a 30 prêmios, sem campos vazios e com até 160 caracteres cada';
  end if;

  if _source in ('compradores_evento', 'checkins_evento') then
    if _event_id is null then
      raise exception 'Selecione o evento';
    end if;
    select e.title into v_event_title
    from public.events e
    where e.id = _event_id
      and e.organization_id = v_org_id
      and e.status = 'publicado'
      and not e.is_closed;
    if v_event_title is null then
      raise exception 'O evento selecionado não está ativo ou não pertence à sua organização';
    end if;
  elsif _event_id is not null then
    raise exception 'Este critério não utiliza um evento específico';
  end if;

  insert into public.raffles (
    organization_id, event_id, prize_name, description, title,
    participant_source, period_start, period_end, entry_mode
  )
  values (
    v_org_id,
    case when _source in ('compradores_evento', 'checkins_evento') then _event_id else null end,
    btrim(_prizes[1]), null, btrim(_title),
    _source, _period_start, _period_end,
    case when _source = 'clientes_cadastrados' then 'pessoa' else _entry_mode end
  )
  returning id into v_raffle_id;

  insert into public.raffle_prizes (raffle_id, organization_id, prize_name, position)
  select v_raffle_id, v_org_id, btrim(p.label), p.position::integer
  from unnest(_prizes) with ordinality as p(label, position);

  if _source = 'clientes_cadastrados' then
    insert into public.raffle_participants (
      raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
    )
    select v_raffle_id, coalesce(nullif(btrim(q.full_name), ''), 'Cliente'),
           q.whatsapp, 'user:' || q.user_id::text, 1, q.customer_id
    from (
      select distinct on (c.user_id)
        c.id as customer_id, c.user_id, c.full_name, c.whatsapp
      from public.customers c
      join auth.users u on u.id = c.user_id
      where c.organization_id = v_org_id
        and c.user_id is not null
        and (_period_start is null or (u.created_at at time zone 'America/Sao_Paulo')::date >= _period_start)
        and (_period_end is null or (u.created_at at time zone 'America/Sao_Paulo')::date <= _period_end)
      order by c.user_id, c.created_at desc
    ) q;

  elsif _source = 'checkins_evento' then
    if _entry_mode = 'pessoa' then
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      select v_raffle_id, q.full_name, null, q.participant_key, 1, q.ticket_id
      from (
        select distinct on (participant_key)
          participant_key, full_name, ticket_id
        from (
          select
            case when nullif(btrim(t.participant_name), '') is null
              then 'ticket:' || t.id::text
              else 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
            end as participant_key,
            coalesce(nullif(btrim(t.participant_name), ''), 'Participante') as full_name,
            t.id as ticket_id,
            t.checked_in_at
          from public.tickets t
          join public.sales s on s.id = t.sale_id
          where t.organization_id = v_org_id
            and t.event_id = _event_id
            and t.status = 'utilizado'
            and t.checked_in_at is not null
            and not s.is_test

            and coalesce(s.refunded_amount, 0) < s.total_amount
            and (_period_start is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date >= _period_start)
            and (_period_end is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date <= _period_end)
        ) raw
        order by participant_key, checked_in_at, ticket_id
      ) q;
    else
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      select v_raffle_id, q.full_name, null, q.participant_key,
             row_number() over (partition by q.participant_key order by q.checked_in_at, q.ticket_id)::integer,
             q.ticket_id
      from (
        select
          case when nullif(btrim(t.participant_name), '') is null
            then 'ticket:' || t.id::text
            else 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
          end as participant_key,
          coalesce(nullif(btrim(t.participant_name), ''), 'Participante') as full_name,
          t.id as ticket_id,
          t.checked_in_at
        from public.tickets t
        join public.sales s on s.id = t.sale_id
        where t.organization_id = v_org_id
          and t.event_id = _event_id
          and t.status = 'utilizado'
          and t.checked_in_at is not null
          and not s.is_test

          and coalesce(s.refunded_amount, 0) < s.total_amount
          and (_period_start is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date <= _period_end)
      ) q;
    end if;

  else
    -- Compradores: somente vendas efetivamente pagas, sem cortesias ou testes,
    -- e que ainda tenham pelo menos um ingresso válido/utilizado.
    if _entry_mode = 'pessoa' then
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      with elegiveis as (
        select
          coalesce(
            'customer:' || s.customer_id::text,
            'buyer:' || nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            'sale:' || s.id::text
          ) as person_key,
          s.buyer_name,
          s.buyer_whatsapp,
          s.id as sale_id,
          s.event_id,
          coalesce(s.paid_at, s.created_at) as purchase_at
        from public.sales s
        where s.organization_id = v_org_id
          and s.status = 'pago'
          and not s.is_courtesy
          and not s.is_test
          and coalesce(s.refunded_amount, 0) < s.total_amount
          and (_source <> 'compradores_evento' or s.event_id = _event_id)
          and (_period_start is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date <= _period_end)
          and exists (
            select 1 from public.tickets t
            where t.sale_id = s.id and t.status in ('valido', 'utilizado')
          )
      ),
      qualificados as (
        select person_key
        from elegiveis
        group by person_key
        having _source <> 'clientes_recorrentes' or count(distinct event_id) >= 2
      )
      select v_raffle_id, q.buyer_name, q.buyer_whatsapp, q.person_key, 1, q.sale_id
      from (
        select distinct on (e.person_key) e.*
        from elegiveis e
        join qualificados x on x.person_key = e.person_key
        order by e.person_key, e.purchase_at desc, e.sale_id desc
      ) q;
    else
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      with elegiveis as (
        select
          s.id as sale_id,
          s.event_id,
          s.buyer_name,
          s.buyer_whatsapp,
          coalesce(
            'customer:' || s.customer_id::text,
            'buyer:' || nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            'sale:' || s.id::text
          ) as person_key,
          coalesce(s.paid_at, s.created_at) as purchase_at
        from public.sales s
        where s.organization_id = v_org_id
          and s.status = 'pago'
          and not s.is_courtesy
          and not s.is_test
          and coalesce(s.refunded_amount, 0) < s.total_amount
          and (_source <> 'compradores_evento' or s.event_id = _event_id)
          and (_period_start is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date <= _period_end)
          and exists (
            select 1 from public.tickets t
            where t.sale_id = s.id and t.status in ('valido', 'utilizado')
          )
      ),
      qualificados as (
        select person_key
        from elegiveis
        group by person_key
        having _source <> 'clientes_recorrentes' or count(distinct event_id) >= 2
      )
      select v_raffle_id,
             coalesce(nullif(btrim(t.participant_name), ''), e.buyer_name),
             e.buyer_whatsapp,
             case
               when nullif(btrim(t.participant_name), '') is not null
                 then 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\\s+', ' ', 'g'))
               else e.person_key
             end,
             row_number() over (
               partition by case
                 when nullif(btrim(t.participant_name), '') is not null
                   then 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\\s+', ' ', 'g'))
                 else e.person_key
               end
               order by e.purchase_at, t.created_at, t.id
             )::integer,
             t.id
      from elegiveis e
      join qualificados x on x.person_key = e.person_key
      join public.tickets t on t.sale_id = e.sale_id and t.status in ('valido', 'utilizado');
    end if;
  end if;

  select count(*), count(distinct participant_key)
    into v_entry_count, v_participant_count
  from public.raffle_participants
  where raffle_id = v_raffle_id;

  if v_entry_count = 0 then
    raise exception 'Nenhum participante foi encontrado com os critérios informados';
  end if;

  if v_participant_count < cardinality(_prizes) then
    raise exception 'Foram encontrados % participantes únicos para % prêmios. Reduza o número de rodadas ou amplie o público.',
      v_participant_count, cardinality(_prizes);
  end if;

  update public.raffles
  set entry_count = v_entry_count,
      participant_count = v_participant_count,
      updated_at = now()
  where id = v_raffle_id;

  return jsonb_build_object(
    'raffle_id', v_raffle_id,
    'participant_count', v_participant_count,
    'entry_count', v_entry_count,
    'event_title', v_event_title
  );
end;
$function$
;

revoke all on function public.create_raffle(text, text, uuid, date, date, text, text[]) from public, anon;
grant execute on function public.create_raffle(text, text, uuid, date, date, text, text[]) to authenticated;
