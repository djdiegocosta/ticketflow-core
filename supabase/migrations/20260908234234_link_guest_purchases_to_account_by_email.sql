CREATE OR REPLACE FUNCTION public.link_guest_purchases_to_current_customer()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_customer_id uuid;
  v_linked integer := 0;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select lower(trim(email)) into v_email
  from auth.users
  where id = v_user_id;

  if v_email is null or v_email = '' then
    return 0;
  end if;

  select id into v_customer_id
  from public.customers
  where user_id = v_user_id
  order by account_created_at desc nulls last, updated_at desc
  limit 1;

  if v_customer_id is null then
    return 0;
  end if;

  update public.sales s
  set customer_id = v_customer_id,
      updated_at = now()
  where s.customer_id is null
    and s.status = 'pago'
    and s.buyer_email is not null
    and lower(trim(s.buyer_email)) = v_email;

  get diagnostics v_linked = row_count;
  return v_linked;
end;
$function$;

REVOKE ALL ON FUNCTION public.link_guest_purchases_to_current_customer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_guest_purchases_to_current_customer() TO authenticated;

DO $$
declare
  r record;
begin
  for r in
    select c.id as customer_id, lower(trim(c.email)) as email
    from public.customers c
    where c.user_id is not null
      and c.email is not null
      and trim(c.email) <> ''
  loop
    update public.sales s
    set customer_id = r.customer_id,
        updated_at = now()
    where s.customer_id is null
      and s.status = 'pago'
      and s.buyer_email is not null
      and lower(trim(s.buyer_email)) = r.email;
  end loop;
end $$;
