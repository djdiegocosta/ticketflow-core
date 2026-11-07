-- Remove a antiga assinatura de sorteio único, que apagava o ganhador anterior.
-- As próximas rodadas mostram somente participantes ainda elegíveis.
-- A seleção final utiliza UUID aleatório gerado no servidor.

drop function if exists public.draw_raffle_winner(uuid);

create or replace function public.get_raffle_details(_raffle_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
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
    'participant_source', v_raffle.participant_source, 'entry_mode', v_raffle.entry_mode,
    'event_id', v_raffle.event_id, 'event_title', v_event_title,
    'period_start', v_raffle.period_start, 'period_end', v_raffle.period_end,
    'participant_count', v_raffle.participant_count, 'entry_count', v_raffle.entry_count,
    'status', v_raffle.status, 'created_at', v_raffle.created_at,
    'completed_at', v_raffle.completed_at,
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
          where w.raffle_id = v_raffle.id
            and w.participant_key = p.participant_key
        )
    ), '[]'::jsonb)
  );
end;
$fn$;

create or replace function public.draw_raffle_winner(_raffle_id uuid, _prize_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
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
      where w.raffle_id = v_raffle.id
        and w.participant_key = p.participant_key
    )
  order by gen_random_uuid()
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

revoke all on function public.get_raffle_details(uuid) from public, anon;
revoke all on function public.draw_raffle_winner(uuid, uuid) from public, anon;
grant execute on function public.get_raffle_details(uuid) to authenticated;
grant execute on function public.draw_raffle_winner(uuid, uuid) to authenticated;
