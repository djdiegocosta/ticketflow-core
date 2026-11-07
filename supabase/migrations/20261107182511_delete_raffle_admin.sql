create or replace function public.delete_raffle(_raffle_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_raffle_id uuid;
begin
  if v_user_id is null or not public.has_role(v_user_id, 'admin'::public.app_role) then
    raise exception 'Acesso restrito ao administrador';
  end if;

  v_org_id := public.get_user_organization(v_user_id);
  if v_org_id is null then
    raise exception 'Organização não identificada';
  end if;

  select r.id into v_raffle_id
  from public.raffles r
  where r.id = _raffle_id
    and r.organization_id = v_org_id
  for update;

  if v_raffle_id is null then
    raise exception 'Sorteio não encontrado ou sem permissão para excluí-lo';
  end if;

  -- Os ganhadores possuem FKs restritivas para participantes e prêmios.
  -- Remove primeiro os registros dependentes, dentro da mesma transação.
  delete from public.raffle_winners
  where raffle_id = v_raffle_id;

  delete from public.raffle_prizes
  where raffle_id = v_raffle_id;

  delete from public.raffle_participants
  where raffle_id = v_raffle_id;

  delete from public.raffles
  where id = v_raffle_id
    and organization_id = v_org_id;
end;
$fn$;

revoke all on function public.delete_raffle(uuid) from public, anon;
grant execute on function public.delete_raffle(uuid) to authenticated;

comment on function public.delete_raffle(uuid) is
  'Exclui um sorteio e seus prêmios, participantes e ganhadores; somente administrador da organização proprietária.';
