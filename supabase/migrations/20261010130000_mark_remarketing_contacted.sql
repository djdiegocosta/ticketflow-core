-- Registra o contato de remarketing (botão WhatsApp). A tabela sales não aceita
-- UPDATE direto (policy "No direct update on sales"), então o clique nunca era salvo.
-- Esta função só aceita admin/colaborador da mesma organização e guarda o 1º contato.
CREATE OR REPLACE FUNCTION public.mark_remarketing_contacted(_sale_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
begin
  select organization_id into v_org_id from public.sales where id = _sale_id;

  if v_org_id is null
     or v_org_id != public.get_user_organization(auth.uid())
     or not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'colaborador')) then
    raise exception 'Sem permissão';
  end if;

  -- Guarda o primeiro contato: cliques seguintes não mudam a data original.
  update public.sales
     set remarketing_contacted_at = coalesce(remarketing_contacted_at, now())
   where id = _sale_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.mark_remarketing_contacted(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_remarketing_contacted(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_remarketing_contacted(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_remarketing_contacted(uuid) TO service_role;
