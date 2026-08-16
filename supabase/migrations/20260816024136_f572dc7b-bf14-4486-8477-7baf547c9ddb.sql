alter table public.profiles add column if not exists cidade text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, full_name, email, whatsapp, cidade)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'whatsapp',
    new.raw_user_meta_data->>'cidade'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        email = coalesce(excluded.email, public.profiles.email),
        whatsapp = coalesce(excluded.whatsapp, public.profiles.whatsapp),
        cidade = coalesce(excluded.cidade, public.profiles.cidade),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.bootstrap_organization(_name text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
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
  values (coalesce(nullif(trim(_name), ''), 'Minha Organização'), 'active', 'start')
  returning id into v_org_id;

  insert into public.user_roles (user_id, organization_id, role)
  values (auth.uid(), v_org_id, 'admin');

  return v_org_id;
end;
$$;

grant execute on function public.bootstrap_organization(text) to authenticated;