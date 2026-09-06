-- AUD-016: version the existing Storage object policies exactly as found in production.
-- Idempotent reconciliation of bucket policies for fresh/replayed environments.
drop policy if exists "Admin pode atualizar logo da propria organizacao" on storage.objects;
drop policy if exists "Admin pode enviar logo da propria organizacao" on storage.objects;
drop policy if exists "Admin pode remover logo da propria organizacao" on storage.objects;
drop policy if exists "Admin sobe imagem de banner da própria organização" on storage.objects;
drop policy if exists "Admin sobe imagem de evento da própria organização" on storage.objects;
drop policy if exists "Logos sao publicos para leitura" on storage.objects;
drop policy if exists "Qualquer um vê imagens de banner" on storage.objects;
drop policy if exists "Qualquer um vê imagens de evento" on storage.objects;

create policy "Admin pode atualizar logo da propria organizacao" on storage.objects for update to public using (
  bucket_id = 'organization-logos' and (storage.foldername(name))[1] = (
    select user_roles.organization_id::text from public.user_roles
    where user_roles.user_id = auth.uid() and user_roles.role = 'admin'::public.app_role limit 1
  )
);
create policy "Admin pode enviar logo da propria organizacao" on storage.objects for insert to public with check (
  bucket_id = 'organization-logos' and (storage.foldername(name))[1] = (
    select user_roles.organization_id::text from public.user_roles
    where user_roles.user_id = auth.uid() and user_roles.role = 'admin'::public.app_role limit 1
  )
);
create policy "Admin pode remover logo da propria organizacao" on storage.objects for delete to public using (
  bucket_id = 'organization-logos' and (storage.foldername(name))[1] = (
    select user_roles.organization_id::text from public.user_roles
    where user_roles.user_id = auth.uid() and user_roles.role = 'admin'::public.app_role limit 1
  )
);
create policy "Admin sobe imagem de banner da própria organização" on storage.objects for insert to public with check (
  bucket_id = 'client-banners' and public.has_role(auth.uid(), 'admin'::public.app_role)
);
create policy "Admin sobe imagem de evento da própria organização" on storage.objects for insert to public with check (
  bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'::public.app_role)
);
create policy "Logos sao publicos para leitura" on storage.objects for select to public using (bucket_id = 'organization-logos');
create policy "Qualquer um vê imagens de banner" on storage.objects for select to public using (bucket_id = 'client-banners');
create policy "Qualquer um vê imagens de evento" on storage.objects for select to public using (bucket_id = 'event-images');
