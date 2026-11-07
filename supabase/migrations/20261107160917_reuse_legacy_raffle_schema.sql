-- Reaproveita as tabelas legadas de sorteio, vazias até esta entrega.
-- Remove as tabelas auxiliares que foram criadas na migration inicial deste trabalho.
drop function if exists public.criar_sorteio(text, text, uuid, date, date, text, text[]);
drop function if exists public.listar_sorteios();
drop function if exists public.detalhar_sorteio(uuid);
drop function if exists public.sortear_ganhador(uuid, uuid);
drop table if exists public.sorteio_ganhadores;
drop table if exists public.sorteio_participantes;
drop table if exists public.sorteio_premios;
drop table if exists public.sorteios;

alter table public.raffles
  alter column event_id drop not null,
  add column title text,
  add column participant_source text not null default 'compradores_evento',
  add column period_start date,
  add column period_end date,
  add column entry_mode text not null default 'pessoa',
  add column participant_count integer not null default 0,
  add column entry_count integer not null default 0,
  add column status text not null default 'ready',
  add column completed_at timestamptz;

update public.raffles
set title = coalesce(nullif(btrim(description), ''), 'Sorteio: ' || prize_name)
where title is null;

alter table public.raffles
  alter column title set not null,
  add constraint raffles_participant_source_check check (
    participant_source in (
      'clientes_cadastrados', 'compradores_evento', 'checkins_evento',
      'compradores_periodo', 'clientes_recorrentes'
    )
  ),
  add constraint raffles_entry_mode_check check (entry_mode in ('pessoa', 'ingresso')),
  add constraint raffles_counts_check check (participant_count >= 0 and entry_count >= 0),
  add constraint raffles_status_check check (status in ('ready', 'completed')),
  add constraint raffles_period_check check (
    period_start is null or period_end is null or period_start <= period_end
  ),
  add constraint raffles_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status = 'ready' and completed_at is null)
  ),
  add constraint raffles_source_event_check check (
    (participant_source in ('compradores_evento', 'checkins_evento') and event_id is not null)
    or (participant_source not in ('compradores_evento', 'checkins_evento') and event_id is null)
  );

create table public.raffle_prizes (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  prize_name text not null check (length(btrim(prize_name)) between 1 and 160),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (raffle_id, position)
);

alter table public.raffle_participants
  add column participant_key text,
  add column entry_number integer not null default 1,
  add column source_record_id uuid;

update public.raffle_participants
set participant_key = case
  when nullif(regexp_replace(coalesce(whatsapp, ''), '[^0-9]', '', 'g'), '') is not null
    then 'buyer:' || regexp_replace(whatsapp, '[^0-9]', '', 'g')
  else 'attendee:' || lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g'))
end
where participant_key is null;

alter table public.raffle_participants
  alter column participant_key set not null;

alter table public.raffle_winners
  add column participant_key text,
  add column prize_id uuid references public.raffle_prizes(id) on delete restrict;

update public.raffle_winners w
set participant_key = p.participant_key
from public.raffle_participants p
where p.id = w.participant_id
  and w.participant_key is null;

insert into public.raffle_prizes (raffle_id, organization_id, prize_name, position)
select r.id, r.organization_id, r.prize_name, 1
from public.raffles r
where not exists (
  select 1 from public.raffle_prizes p where p.raffle_id = r.id
);

update public.raffle_winners w
set prize_id = p.id
from public.raffle_prizes p
where p.raffle_id = w.raffle_id
  and p.position = 1
  and w.prize_id is null;

create unique index raffle_participants_chance_unique
  on public.raffle_participants (raffle_id, participant_key, entry_number);
create unique index raffle_winners_person_once
  on public.raffle_winners (raffle_id, participant_key)
  where participant_key is not null;
create unique index raffle_winners_prize_once
  on public.raffle_winners (prize_id)
  where prize_id is not null;
create index raffle_prizes_order_idx on public.raffle_prizes (raffle_id, position);

alter table public.raffle_prizes enable row level security;

drop policy if exists "Admins access own organization raffle prizes" on public.raffle_prizes;
create policy "Admins manage raffle prizes in own organization"
on public.raffle_prizes for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Admin gerencia sorteios da própria organização" on public.raffles;
create policy "Admins manage raffles in own organization"
on public.raffles for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

drop policy if exists "Admin gerencia participantes de sorteios da própria organizaç" on public.raffle_participants;
create policy "Admins manage raffle participants in own organization"
on public.raffle_participants for all to authenticated
using (
  exists (
    select 1 from public.raffles r
    where r.id = raffle_participants.raffle_id
      and r.organization_id = public.get_user_organization((select auth.uid()))
      and public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
)
with check (
  exists (
    select 1 from public.raffles r
    where r.id = raffle_participants.raffle_id
      and r.organization_id = public.get_user_organization((select auth.uid()))
      and public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
);

drop policy if exists "Admin vê vencedores de sorteios da própria organização" on public.raffle_winners;
create policy "Admins manage raffle winners in own organization"
on public.raffle_winners for all to authenticated
using (
  exists (
    select 1 from public.raffles r
    where r.id = raffle_winners.raffle_id
      and r.organization_id = public.get_user_organization((select auth.uid()))
      and public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
)
with check (
  exists (
    select 1 from public.raffles r
    where r.id = raffle_winners.raffle_id
      and r.organization_id = public.get_user_organization((select auth.uid()))
      and public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
);

revoke all on table public.raffles, public.raffle_participants, public.raffle_winners, public.raffle_prizes
from public, anon, authenticated;

revoke all on function public.draw_raffle_winner(uuid) from public, anon, authenticated;

create or replace function public.create_raffle(
  _title text, _source text, _event_id uuid, _period_start date,
  _period_end date, _entry_mode text, _prizes text[]
)
returns jsonb language plpgsql security definer set search_path to 'public'
as $fn$
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
  if v_org_id is null then raise exception 'Organização não identificada'; end if;
  if _title is null or length(btrim(_title)) = 0 or length(btrim(_title)) > 120 then
    raise exception 'Informe o nome do sorteio (até 120 caracteres)';
  end if;
  if _source not in (
    'clientes_cadastrados', 'compradores_evento', 'checkins_evento',
    'compradores_periodo', 'clientes_recorrentes'
  ) then raise exception 'Critério de participantes inválido'; end if;
  if _entry_mode not in ('pessoa', 'ingresso') then
    raise exception 'Modo de participação inválido';
  end if;
  if _source = 'clientes_cadastrados' and _entry_mode <> 'pessoa' then
    raise exception 'Clientes cadastrados participam uma vez por conta';
  end if;
  if (_period_start is null) <> (_period_end is null) then
    raise exception 'Informe as duas datas ou deixe ambas vazias';
  end if;
  if _period_start is not null and _period_end < _period_start then
    raise exception 'O período informado é inválido';
  end if;
  if _prizes is null or cardinality(_prizes) < 1 or cardinality(_prizes) > 30
    or exists (
      select 1 from unnest(_prizes) p
      where length(btrim(p)) = 0 or length(btrim(p)) > 160
    ) then
    raise exception 'Informe de 1 a 30 prêmios válidos, com até 160 caracteres';
  end if;

  if _source in ('compradores_evento', 'checkins_evento') then
    if _event_id is null then raise exception 'Selecione o evento'; end if;
    select e.title into v_event_title
    from public.events e
    where e.id = _event_id and e.organization_id = v_org_id
      and e.status = 'publicado' and not e.is_closed;
    if v_event_title is null then
      raise exception 'Evento ativo não encontrado nesta organização';
    end if;
  elsif _event_id is not null then
    raise exception 'Este critério não utiliza evento específico';
  end if;

  insert into public.raffles (
    organization_id, event_id, prize_name, description, title,
    participant_source, period_start, period_end, entry_mode
  )
  values (
    v_org_id,
    case when _source in ('compradores_evento', 'checkins_evento') then _event_id else null end,
    btrim(_prizes[1]), null, btrim(_title), _source, _period_start, _period_end,
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
        c.id customer_id, c.user_id, c.full_name, c.whatsapp
      from public.customers c
      join auth.users u on u.id = c.user_id
      where c.organization_id = v_org_id and c.user_id is not null
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
        select distinct on (participant_key) participant_key, full_name, ticket_id
        from (
          select
            case when nullif(btrim(t.participant_name), '') is null
              then 'ticket:' || t.id::text
              else 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
            end participant_key,
            coalesce(nullif(btrim(t.participant_name), ''), 'Participante') full_name,
            t.id ticket_id, t.checked_in_at
          from public.tickets t
          join public.sales s on s.id = t.sale_id
          where t.organization_id = v_org_id and t.event_id = _event_id
            and t.status = 'utilizado' and t.checked_in_at is not null
            and not s.is_test
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
          end participant_key,
          coalesce(nullif(btrim(t.participant_name), ''), 'Participante') full_name,
          t.id ticket_id, t.checked_in_at
        from public.tickets t
        join public.sales s on s.id = t.sale_id
        where t.organization_id = v_org_id and t.event_id = _event_id
          and t.status = 'utilizado' and t.checked_in_at is not null
          and not s.is_test
          and (_period_start is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date <= _period_end)
      ) q;
    end if;

  else
    if _entry_mode = 'pessoa' then
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      with eligible as (
        select
          'buyer:' || coalesce(
            nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            s.customer_id::text, s.id::text
          ) person_key,
          s.buyer_name, s.buyer_whatsapp, s.id sale_id, s.event_id,
          coalesce(s.paid_at, s.created_at) purchase_at
        from public.sales s
        where s.organization_id = v_org_id and s.status = 'pago'
          and not s.is_courtesy and not s.is_test
          and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
          and (_source <> 'compradores_evento' or s.event_id = _event_id)
          and (_period_start is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date <= _period_end)
          and exists (select 1 from public.tickets t where t.sale_id = s.id and t.status in ('valido','utilizado'))
      ), qualified as (
        select person_key from eligible group by person_key
        having _source <> 'clientes_recorrentes' or count(distinct event_id) >= 2
      )
      select v_raffle_id, x.buyer_name, x.buyer_whatsapp, x.person_key, 1, x.sale_id
      from (
        select distinct on (e.person_key) e.*
        from eligible e join qualified q on q.person_key = e.person_key
        order by e.person_key, e.purchase_at desc, e.sale_id desc
      ) x;
    else
      insert into public.raffle_participants (
        raffle_id, full_name, whatsapp, participant_key, entry_number, source_record_id
      )
      with eligible as (
        select s.id sale_id, s.event_id, s.buyer_name, s.buyer_whatsapp,
          'buyer:' || coalesce(
            nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            s.customer_id::text, s.id::text
          ) person_key,
          coalesce(s.paid_at, s.created_at) purchase_at
        from public.sales s
        where s.organization_id = v_org_id and s.status = 'pago'
          and not s.is_courtesy and not s.is_test
          and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
          and (_source <> 'compradores_evento' or s.event_id = _event_id)
          and (_period_start is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (coalesce(s.paid_at, s.created_at) at time zone 'America/Sao_Paulo')::date <= _period_end)
          and exists (select 1 from public.tickets t where t.sale_id = s.id and t.status in ('valido','utilizado'))
      ), qualified as (
        select person_key from eligible group by person_key
        having _source <> 'clientes_recorrentes' or count(distinct event_id) >= 2
      )
      select v_raffle_id,
        coalesce(nullif(btrim(t.participant_name), ''), e.buyer_name),
        e.buyer_whatsapp,
        case
          when nullif(btrim(t.participant_name), '') is not null
            then 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
          else e.person_key
        end,
        row_number() over (
          partition by case
            when nullif(btrim(t.participant_name), '') is not null
              then 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
            else e.person_key
          end
          order by e.purchase_at, t.created_at, t.id
        )::integer,
        t.id
      from eligible e
      join qualified q on q.person_key = e.person_key
      join public.tickets t on t.sale_id = e.sale_id and t.status in ('valido','utilizado');
    end if;
  end if;

  select count(*), count(distinct participant_key)
  into v_entry_count, v_participant_count
  from public.raffle_participants where raffle_id = v_raffle_id;

  if v_entry_count = 0 then
    raise exception 'Nenhum participante encontrado com estes critérios';
  end if;

  update public.raffles set entry_count = v_entry_count,
    participant_count = v_participant_count, updated_at = now()
  where id = v_raffle_id;

  return jsonb_build_object(
    'raffle_id', v_raffle_id,
    'participant_count', v_participant_count,
    'entry_count', v_entry_count,
    'event_title', v_event_title
  );
end;
$fn$;

create or replace function public.list_raffles()
returns table (
  id uuid, title text, participant_source text, entry_mode text, event_id uuid,
  event_title text, participant_count integer, entry_count integer,
  prize_count integer, winner_count integer, status text,
  created_at timestamptz, completed_at timestamptz
)
language plpgsql stable security definer set search_path to 'public'
as $fn$
declare
  v_org_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;
  v_org_id := public.get_user_organization(auth.uid());
  return query
  select r.id, r.title, r.participant_source, r.entry_mode, r.event_id, e.title,
    r.participant_count, r.entry_count,
    (select count(*)::integer from public.raffle_prizes p where p.raffle_id = r.id),
    (select count(*)::integer from public.raffle_winners w where w.raffle_id = r.id),
    r.status, r.created_at, r.completed_at
  from public.raffles r
  left join public.events e on e.id = r.event_id
  where r.organization_id = v_org_id
  order by r.created_at desc;
end;
$fn$;

create or replace function public.get_raffle_details(_raffle_id uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $fn$
declare
  v_org_id uuid;
  v_raffle public.raffles%rowtype;
  v_event_title text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;
  v_org_id := public.get_user_organization(auth.uid());
  select r.* into v_raffle from public.raffles r
  where r.id = _raffle_id and r.organization_id = v_org_id;
  if not found then raise exception 'Sorteio não encontrado'; end if;
  select e.title into v_event_title from public.events e where e.id = v_raffle.event_id;

  return jsonb_build_object(
    'id', v_raffle.id, 'title', v_raffle.title,
    'participant_source', v_raffle.participant_source,
    'entry_mode', v_raffle.entry_mode,
    'event_id', v_raffle.event_id, 'event_title', v_event_title,
    'period_start', v_raffle.period_start, 'period_end', v_raffle.period_end,
    'participant_count', v_raffle.participant_count,
    'entry_count', v_raffle.entry_count, 'status', v_raffle.status,
    'created_at', v_raffle.created_at, 'completed_at', v_raffle.completed_at,
    'prizes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'label', p.prize_name, 'position', p.position,
        'winner', case when w.id is null then null else jsonb_build_object(
          'participant_name', participant.full_name, 'drawn_at', w.drawn_at
        ) end
      ) order by p.position)
      from public.raffle_prizes p
      left join public.raffle_winners w on w.prize_id = p.id
      left join public.raffle_participants participant on participant.id = w.participant_id
      where p.raffle_id = v_raffle.id
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(p.full_name order by p.id)
      from public.raffle_participants p
      where p.raffle_id = v_raffle.id
        and not exists (
          select 1 from public.raffle_winners w
          where w.raffle_id = v_raffle.id and w.participant_key = p.participant_key
        )
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.draw_raffle_winner(_raffle_id uuid, _prize_id uuid)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $fn$
declare
  v_org_id uuid;
  v_raffle public.raffles%rowtype;
  v_prize public.raffle_prizes%rowtype;
  v_participant public.raffle_participants%rowtype;
  v_winner_id uuid;
  v_drawn_at timestamptz;
  v_winner_count integer;
  v_prize_count integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;
  v_org_id := public.get_user_organization(auth.uid());
  select r.* into v_raffle from public.raffles r
  where r.id = _raffle_id and r.organization_id = v_org_id
  for update;
  if not found then raise exception 'Sorteio não encontrado'; end if;
  if v_raffle.status = 'completed' then raise exception 'Este sorteio já foi concluído'; end if;

  select p.* into v_prize from public.raffle_prizes p
  where p.id = _prize_id and p.raffle_id = v_raffle.id;
  if not found then raise exception 'Rodada não encontrada neste sorteio'; end if;
  if exists (select 1 from public.raffle_winners w where w.prize_id = v_prize.id) then
    raise exception 'Esta rodada já possui um ganhador';
  end if;

  select p.* into v_participant
  from public.raffle_participants p
  where p.raffle_id = v_raffle.id
    and not exists (
      select 1 from public.raffle_winners w
      where w.raffle_id = v_raffle.id and w.participant_key = p.participant_key
    )
  order by pg_catalog.random()
  limit 1;
  if not found then raise exception 'Não há participantes elegíveis restantes para esta rodada'; end if;

  insert into public.raffle_winners (raffle_id, participant_id, prize_id, participant_key)
  values (v_raffle.id, v_participant.id, v_prize.id, v_participant.participant_key)
  returning id, drawn_at into v_winner_id, v_drawn_at;

  select count(*)::integer into v_winner_count
  from public.raffle_winners w where w.raffle_id = v_raffle.id;
  select count(*)::integer into v_prize_count
  from public.raffle_prizes p where p.raffle_id = v_raffle.id;

  if v_winner_count = v_prize_count then
    update public.raffles set status = 'completed',
      completed_at = now(), updated_at = now()
    where id = v_raffle.id;
  end if;

  return jsonb_build_object(
    'winner_id', v_winner_id, 'raffle_id', v_raffle.id,
    'prize_id', v_prize.id, 'prize_label', v_prize.prize_name,
    'participant_name', v_participant.full_name, 'drawn_at', v_drawn_at,
    'round', v_prize.position, 'total_rounds', v_prize_count,
    'completed', v_winner_count = v_prize_count
  );
end;
$fn$;

revoke all on function public.create_raffle(text, text, uuid, date, date, text, text[]) from public, anon;
revoke all on function public.list_raffles() from public, anon;
revoke all on function public.get_raffle_details(uuid) from public, anon;
revoke all on function public.draw_raffle_winner(uuid, uuid) from public, anon;
grant execute on function public.create_raffle(text, text, uuid, date, date, text, text[]) to authenticated;
grant execute on function public.list_raffles() to authenticated;
grant execute on function public.get_raffle_details(uuid) to authenticated;
grant execute on function public.draw_raffle_winner(uuid, uuid) to authenticated;

comment on table public.raffle_prizes is 'Prêmios e rodadas de um sorteio do TicketFlow.';
comment on table public.raffle_participants is 'Snapshot de chances de participação no momento da criação do sorteio.';
comment on table public.raffle_winners is 'Ganhadores do sorteio; cada participante pode ganhar apenas uma vez por sorteio.';
