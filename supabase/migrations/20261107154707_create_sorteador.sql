-- TicketFlow — Sorteador administrativo
-- Banco remoto aplicado na migration 20261107154707_create_sorteador.
-- Estruturas isoladas; não altera o mecanismo legado public.raffles.

create table public.sorteios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  participant_source text not null check (participant_source in (
    'clientes_cadastrados', 'compradores_evento', 'checkins_evento',
    'compradores_periodo', 'clientes_recorrentes'
  )),
  event_id uuid null references public.events(id) on delete restrict,
  period_start date null,
  period_end date null,
  entry_mode text not null default 'pessoa' check (entry_mode in ('pessoa', 'ingresso')),
  participant_count integer not null default 0 check (participant_count >= 0),
  entry_count integer not null default 0 check (entry_count >= 0),
  status text not null default 'ready' check (status in ('ready', 'completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  constraint sorteios_event_source_check check (
    (participant_source in ('compradores_evento', 'checkins_evento') and event_id is not null)
    or (participant_source not in ('compradores_evento', 'checkins_evento') and event_id is null)
  ),
  constraint sorteios_period_check check (
    period_start is null or period_end is null or period_start <= period_end
  ),
  constraint sorteios_completed_at_check check (
    (status = 'completed' and completed_at is not null)
    or (status = 'ready' and completed_at is null)
  )
);

create table public.sorteio_premios (
  id uuid primary key default gen_random_uuid(),
  sorteio_id uuid not null references public.sorteios(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  label text not null check (length(btrim(label)) between 1 and 160),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (sorteio_id, position)
);

create table public.sorteio_participantes (
  id uuid primary key default gen_random_uuid(),
  sorteio_id uuid not null references public.sorteios(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  participant_key text not null,
  participant_name text not null,
  entry_number integer not null check (entry_number > 0),
  source_record_id uuid null,
  created_at timestamptz not null default now(),
  unique (sorteio_id, participant_key, entry_number)
);

create table public.sorteio_ganhadores (
  id uuid primary key default gen_random_uuid(),
  sorteio_id uuid not null references public.sorteios(id) on delete cascade,
  premio_id uuid not null references public.sorteio_premios(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  participante_id uuid not null references public.sorteio_participantes(id) on delete restrict,
  participant_key text not null,
  participant_name text not null,
  drawn_at timestamptz not null default now(),
  unique (sorteio_id, participant_key),
  unique (premio_id)
);

create index sorteios_org_created_idx on public.sorteios (organization_id, created_at desc);
create index sorteio_participantes_sorteio_idx on public.sorteio_participantes (sorteio_id);
create index sorteio_ganhadores_sorteio_idx on public.sorteio_ganhadores (sorteio_id, drawn_at);

alter table public.sorteios enable row level security;
alter table public.sorteio_premios enable row level security;
alter table public.sorteio_participantes enable row level security;
alter table public.sorteio_ganhadores enable row level security;

create policy "Admins access own organization sorteios"
on public.sorteios for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Admins access own organization sorteio prizes"
on public.sorteio_premios for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Admins access own organization sorteio participants"
on public.sorteio_participantes for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);
create policy "Admins access own organization sorteio winners"
on public.sorteio_ganhadores for all to authenticated
using (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
)
with check (
  organization_id = public.get_user_organization((select auth.uid()))
  and public.has_role((select auth.uid()), 'admin'::public.app_role)
);

revoke all on table public.sorteios, public.sorteio_premios, public.sorteio_participantes, public.sorteio_ganhadores
from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.criar_sorteio(_title text, _source text, _event_id uuid, _period_start date, _period_end date, _entry_mode text, _prizes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_sorteio_id uuid;
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

  if _period_start is not null and _period_end is not null and _period_end < _period_start then
    raise exception 'O período informado é inválido';
  end if;

  if _prizes is null or cardinality(_prizes) < 1 or cardinality(_prizes) > 30
    or exists (select 1 from unnest(_prizes) p where length(btrim(p)) = 0 or length(btrim(p)) > 160) then
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

  insert into public.sorteios (
    organization_id, created_by, title, participant_source, event_id,
    period_start, period_end, entry_mode
  )
  values (
    v_org_id, v_user_id, btrim(_title), _source,
    case when _source in ('compradores_evento', 'checkins_evento') then _event_id else null end,
    _period_start, _period_end,
    case when _source = 'clientes_cadastrados' then 'pessoa' else _entry_mode end
  )
  returning id into v_sorteio_id;

  insert into public.sorteio_premios (sorteio_id, organization_id, label, position)
  select v_sorteio_id, v_org_id, btrim(p.label), p.position::integer
  from unnest(_prizes) with ordinality as p(label, position);

  if _source = 'clientes_cadastrados' then
    -- Data real da criação da conta vem de auth.users, não de customers.created_at:
    -- clientes que compraram como visitante podem ter cadastro de cliente anterior.
    insert into public.sorteio_participantes (
      sorteio_id, organization_id, participant_key, participant_name, entry_number, source_record_id
    )
    select v_sorteio_id, v_org_id, 'user:' || q.user_id::text,
           coalesce(nullif(btrim(q.full_name), ''), 'Cliente'), 1, q.customer_id
    from (
      select distinct on (c.user_id)
        c.id as customer_id, c.user_id, c.full_name, c.created_at
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
      insert into public.sorteio_participantes (
        sorteio_id, organization_id, participant_key, participant_name, entry_number, source_record_id
      )
      select v_sorteio_id, v_org_id, q.participant_key, q.participant_name, 1, q.ticket_id
      from (
        select distinct on (participant_key)
          participant_key, participant_name, ticket_id
        from (
          select
            case
              when btrim(t.participant_name) = '' then 'ticket:' || t.id::text
              else 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
            end as participant_key,
            coalesce(nullif(btrim(t.participant_name), ''), 'Participante') as participant_name,
            t.id as ticket_id,
            t.checked_in_at
          from public.tickets t
          join public.sales s on s.id = t.sale_id
          where t.organization_id = v_org_id
            and t.event_id = _event_id
            and t.status = 'utilizado'
            and t.checked_in_at is not null
            and s.status = 'pago'
            and not s.is_test
            and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
            and (_period_start is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date >= _period_start)
            and (_period_end is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date <= _period_end)
        ) raw
        order by participant_key, checked_in_at, ticket_id
      ) q;
    else
      insert into public.sorteio_participantes (
        sorteio_id, organization_id, participant_key, participant_name, entry_number, source_record_id
      )
      select v_sorteio_id, v_org_id, q.participant_key, q.participant_name,
             row_number() over (partition by q.participant_key order by q.checked_in_at, q.ticket_id)::integer,
             q.ticket_id
      from (
        select
          case
            when btrim(t.participant_name) = '' then 'ticket:' || t.id::text
            else 'attendee:' || lower(regexp_replace(btrim(t.participant_name), '\s+', ' ', 'g'))
          end as participant_key,
          coalesce(nullif(btrim(t.participant_name), ''), 'Participante') as participant_name,
          t.id as ticket_id,
          t.checked_in_at
        from public.tickets t
        join public.sales s on s.id = t.sale_id
        where t.organization_id = v_org_id
          and t.event_id = _event_id
          and t.status = 'utilizado'
          and t.checked_in_at is not null
          and s.status = 'pago'
          and not s.is_test
          and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
          and (_period_start is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date >= _period_start)
          and (_period_end is null or (t.checked_in_at at time zone 'America/Sao_Paulo')::date <= _period_end)
      ) q;
    end if;

  else
    -- Critérios baseados em compra. "Por ingresso" cria uma chance por ticket;
    -- "Por pessoa" consolida pelo WhatsApp do comprador (com fallback interno).
    if _entry_mode = 'pessoa' then
      insert into public.sorteio_participantes (
        sorteio_id, organization_id, participant_key, participant_name, entry_number, source_record_id
      )
      with elegiveis as (
        select
          'buyer:' || coalesce(
            nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            s.customer_id::text,
            s.id::text
          ) as person_key,
          s.buyer_name,
          s.id as sale_id,
          s.event_id,
          coalesce(s.paid_at, s.created_at) as purchase_at
        from public.sales s
        where s.organization_id = v_org_id
          and s.status = 'pago'
          and not s.is_courtesy
          and not s.is_test
          and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
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
      select v_sorteio_id, v_org_id, e.person_key,
             coalesce(nullif(btrim(e.buyer_name), ''), 'Comprador'), 1, e.sale_id
      from (
        select distinct on (e.person_key) e.*
        from elegiveis e
        join qualificados q on q.person_key = e.person_key
        order by e.person_key, e.purchase_at desc, e.sale_id desc
      ) e;
    else
      insert into public.sorteio_participantes (
        sorteio_id, organization_id, participant_key, participant_name, entry_number, source_record_id
      )
      with elegiveis as (
        select
          'buyer:' || coalesce(
            nullif(regexp_replace(coalesce(s.buyer_whatsapp, ''), '[^0-9]', '', 'g'), ''),
            s.customer_id::text,
            s.id::text
          ) as person_key,
          s.buyer_name,
          s.id as sale_id,
          s.event_id,
          coalesce(s.paid_at, s.created_at) as purchase_at
        from public.sales s
        where s.organization_id = v_org_id
          and s.status = 'pago'
          and not s.is_courtesy
          and not s.is_test
          and (coalesce(s.refunded_amount, 0) = 0 or coalesce(s.refunded_amount, 0) < s.total_amount)
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
      select v_sorteio_id, v_org_id, e.person_key,
             coalesce(nullif(btrim(e.buyer_name), ''), 'Comprador'),
             row_number() over (partition by e.person_key order by e.purchase_at, t.created_at, t.id)::integer,
             t.id
      from elegiveis e
      join qualificados q on q.person_key = e.person_key
      join public.tickets t on t.sale_id = e.sale_id and t.status in ('valido', 'utilizado');
    end if;
  end if;

  select count(*), count(distinct participant_key)
    into v_entry_count, v_participant_count
  from public.sorteio_participantes
  where sorteio_id = v_sorteio_id;

  if v_entry_count = 0 then
    raise exception 'Nenhum participante foi encontrado com os critérios informados';
  end if;

  update public.sorteios
  set entry_count = v_entry_count,
      participant_count = v_participant_count
  where id = v_sorteio_id;

  return jsonb_build_object(
    'sorteio_id', v_sorteio_id,
    'participant_count', v_participant_count,
    'entry_count', v_entry_count,
    'event_title', v_event_title
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.listar_sorteios()
 RETURNS TABLE(id uuid, title text, participant_source text, entry_mode text, event_id uuid, event_title text, participant_count integer, entry_count integer, prize_count integer, winner_count integer, status text, created_at timestamp with time zone, completed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_org_id := public.get_user_organization(auth.uid());

  return query
  select
    s.id, s.title, s.participant_source, s.entry_mode, s.event_id, e.title,
    s.participant_count, s.entry_count,
    (select count(*)::integer from public.sorteio_premios p where p.sorteio_id = s.id),
    (select count(*)::integer from public.sorteio_ganhadores g where g.sorteio_id = s.id),
    s.status, s.created_at, s.completed_at
  from public.sorteios s
  left join public.events e on e.id = s.event_id
  where s.organization_id = v_org_id
  order by s.created_at desc;
end;
$function$


CREATE OR REPLACE FUNCTION public.detalhar_sorteio(_sorteio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_sorteio public.sorteios%rowtype;
  v_event_title text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_org_id := public.get_user_organization(auth.uid());

  select s.* into v_sorteio
  from public.sorteios s
  where s.id = _sorteio_id and s.organization_id = v_org_id;

  if not found then
    raise exception 'Sorteio não encontrado';
  end if;

  select e.title into v_event_title
  from public.events e
  where e.id = v_sorteio.event_id;

  return jsonb_build_object(
    'id', v_sorteio.id,
    'title', v_sorteio.title,
    'participant_source', v_sorteio.participant_source,
    'entry_mode', v_sorteio.entry_mode,
    'event_id', v_sorteio.event_id,
    'event_title', v_event_title,
    'period_start', v_sorteio.period_start,
    'period_end', v_sorteio.period_end,
    'participant_count', v_sorteio.participant_count,
    'entry_count', v_sorteio.entry_count,
    'status', v_sorteio.status,
    'created_at', v_sorteio.created_at,
    'completed_at', v_sorteio.completed_at,
    'prizes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'label', p.label,
          'position', p.position,
          'winner', case when g.id is null then null else jsonb_build_object(
            'participant_name', g.participant_name,
            'drawn_at', g.drawn_at
          ) end
        ) order by p.position
      )
      from public.sorteio_premios p
      left join public.sorteio_ganhadores g on g.premio_id = p.id
      where p.sorteio_id = v_sorteio.id
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(p.participant_name order by p.id)
      from public.sorteio_participantes p
      where p.sorteio_id = v_sorteio.id
    ), '[]'::jsonb)
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.sortear_ganhador(_sorteio_id uuid, _premio_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_sorteio public.sorteios%rowtype;
  v_premio public.sorteio_premios%rowtype;
  v_participante public.sorteio_participantes%rowtype;
  v_ganhador_id uuid;
  v_drawn_at timestamptz;
  v_winner_count integer;
  v_prize_count integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_org_id := public.get_user_organization(auth.uid());

  select s.* into v_sorteio
  from public.sorteios s
  where s.id = _sorteio_id and s.organization_id = v_org_id
  for update;

  if not found then
    raise exception 'Sorteio não encontrado';
  end if;

  if v_sorteio.status = 'completed' then
    raise exception 'Este sorteio já foi concluído';
  end if;

  select p.* into v_premio
  from public.sorteio_premios p
  where p.id = _premio_id and p.sorteio_id = v_sorteio.id;

  if not found then
    raise exception 'Rodada não encontrada neste sorteio';
  end if;

  if exists (select 1 from public.sorteio_ganhadores g where g.premio_id = v_premio.id) then
    raise exception 'Esta rodada já possui um ganhador';
  end if;

  select p.* into v_participante
  from public.sorteio_participantes p
  where p.sorteio_id = v_sorteio.id
    and not exists (
      select 1 from public.sorteio_ganhadores g
      where g.sorteio_id = v_sorteio.id
        and g.participant_key = p.participant_key
    )
  order by pg_catalog.random()
  limit 1;

  if not found then
    raise exception 'Não há participantes elegíveis restantes para esta rodada';
  end if;

  insert into public.sorteio_ganhadores (
    sorteio_id, premio_id, organization_id, participante_id, participant_key, participant_name
  )
  values (
    v_sorteio.id, v_premio.id, v_org_id, v_participante.id, v_participante.participant_key, v_participante.participant_name
  )
  returning id, drawn_at into v_ganhador_id, v_drawn_at;

  select count(*)::integer into v_winner_count
  from public.sorteio_ganhadores g where g.sorteio_id = v_sorteio.id;

  select count(*)::integer into v_prize_count
  from public.sorteio_premios p where p.sorteio_id = v_sorteio.id;

  if v_winner_count = v_prize_count then
    update public.sorteios
    set status = 'completed', completed_at = now()
    where id = v_sorteio.id;
  end if;

  return jsonb_build_object(
    'winner_id', v_ganhador_id,
    'sorteio_id', v_sorteio.id,
    'premio_id', v_premio.id,
    'prize_label', v_premio.label,
    'participant_name', v_participante.participant_name,
    'drawn_at', v_drawn_at,
    'round', v_premio.position,
    'total_rounds', v_prize_count,
    'completed', v_winner_count = v_prize_count
  );
end;
$function$


revoke all on function public.criar_sorteio(text, text, uuid, date, date, text, text[]) from public, anon;
revoke all on function public.listar_sorteios() from public, anon;
revoke all on function public.detalhar_sorteio(uuid) from public, anon;
revoke all on function public.sortear_ganhador(uuid, uuid) from public, anon;

grant execute on function public.criar_sorteio(text, text, uuid, date, date, text, text[]) to authenticated;
grant execute on function public.listar_sorteios() to authenticated;
grant execute on function public.detalhar_sorteio(uuid) to authenticated;
grant execute on function public.sortear_ganhador(uuid, uuid) to authenticated;

comment on table public.sorteios is 'Sorteios administrativos do TicketFlow. Isolado dos fluxos legados de venda, ingresso, check-in e XP.';
comment on table public.sorteio_participantes is 'Snapshot imutável de chances de participação no momento da criação do sorteio.';
comment on table public.sorteio_ganhadores is 'Ganhadores sorteados no servidor, com restrição para não repetir participante dentro do mesmo sorteio.';
