CREATE OR REPLACE FUNCTION public.signup_customer(_full_name text, _whatsapp text, _email text, _cidade text)
RETURNS TABLE(customer_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_customer_id uuid;
  v_email text := lower(trim(_email));
begin
  if auth.uid() is null then raise exception 'Usuário não autenticado'; end if;
  v_org_id := public.get_default_organization();

  insert into public.customers (organization_id, user_id, full_name, whatsapp, email, cidade, account_created_at)
  values (v_org_id, auth.uid(), _full_name, _whatsapp, v_email, _cidade, now())
  on conflict (organization_id, whatsapp) do update
    set user_id = auth.uid(), full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email),
        cidade = coalesce(excluded.cidade, public.customers.cidade),
        account_created_at = coalesce(public.customers.account_created_at, now()),
        updated_at = now()
  returning id into v_customer_id;

  update public.sales s
  set customer_id = v_customer_id,
      updated_at = now()
  where s.customer_id is null
    and s.status = 'pago'
    and s.buyer_email is not null
    and lower(trim(s.buyer_email)) = v_email;

  return query select v_customer_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.signup_customer(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_customer(text,text,text,text) TO authenticated;
