-- Corrige o botão "Remover" da tela de Usuários (módulo Usuários).
--
-- Bug encontrado: o front-end fazia DELETE direto em user_roles usando o
-- mesmo "id" tanto para membros de verdade quanto para convites pendentes.
-- Só que convite pendente tem um id diferente (da tabela pending_invites,
-- não de user_roles) — então clicar em "Remover" num convite não apagava
-- nada, mas mostrava mensagem de sucesso mesmo assim.
--
-- Esta função resolve os dois casos, sempre restrita à própria organização
-- de quem está chamando, e impede que um admin remova a própria conta.
CREATE OR REPLACE FUNCTION public.remove_user_or_invite(_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_deleted_roles integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Sem permissão';
  end if;

  if _id = auth.uid() then
    raise exception 'Você não pode remover a própria conta';
  end if;

  v_org_id := public.get_user_organization(auth.uid());

  delete from public.user_roles
  where user_id = _id and organization_id = v_org_id;
  get diagnostics v_deleted_roles = row_count;

  if v_deleted_roles = 0 then
    delete from public.pending_invites
    where id = _id and organization_id = v_org_id;
  end if;
end;
$function$;

GRANT EXECUTE ON FUNCTION public.remove_user_or_invite(uuid) TO authenticated;
