-- Testes do rastreamento de visitantes (migration 20261029190000).
-- Rode DEPOIS da migration (ou cole a migration + este arquivo juntos para ensaio).
-- Termina de propósito com o erro "RESULTADOS rastreamento (tudo desfeito)": isso DESFAZ todos os dados de teste.
DO $t$
DECLARE
  ev uuid; ev_closed uuid; ev_draft uuid; v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid();
  antes_legado int; depois_legado int; n int; n2 int; u int; r record; adm uuid := gen_random_uuid(); cli uuid := gen_random_uuid();
  org uuid; vistas int; ok_anon boolean; draft_label text;
  res text[] := '{}';
BEGIN
  select id into ev from public.events where status = 'publicado' and not is_closed limit 1;
  select id into ev_closed from public.events where is_closed limit 1;
  select enumlabel into draft_label from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'event_status' and e.enumlabel <> 'publicado' limit 1;
  select id into org from public.organizations limit 1;
  insert into public.events (organization_id, title, event_date, location, slug, status)
    values (org, 'TESTE RASCUNHO', now() + interval '10 days', 'x', 'teste-visitas-rascunho', draft_label::public.event_status) returning id into ev_draft;
  select count(*) into antes_legado from public.event_page_views where visitor_id is null;

  -- V1: visita válida grava e limpa os campos (minúsculas, 100 caracteres)
  perform public.track_event_visit(ev, v1, ' WWW.Instagram.com ', 'Instagram', 'BIO', repeat('x', 150), ' Bio-IG ');
  select * into r from public.event_page_views where visitor_id = v1;
  res := res || format('%s V1 visita válida grava e normaliza os campos [%s]',
    case when r.id is not null and r.referrer_host = 'www.instagram.com' and r.utm_source = 'instagram' and r.utm_medium = 'bio' and length(r.utm_campaign) = 100 and r.link_code = 'bio-ig' then 'PASS' else 'FAIL' end, coalesce(r.referrer_host,'-')||'/'||coalesce(r.utm_source,'-'));

  -- V2: mesmo visitante em menos de 30 s não duplica
  perform public.track_event_visit(ev, v1);
  select count(*) into n from public.event_page_views where visitor_id = v1;
  res := res || format('%s V2 recarregar em menos de 30 s não duplica [linhas=%s]', case when n = 1 then 'PASS' else 'FAIL' end, n);

  -- V3: outro visitante grava; únicos = 2
  perform public.track_event_visit(ev, v2);
  select count(distinct visitor_id) into u from public.event_page_views where event_id = ev and visitor_id in (v1, v2);
  res := res || format('%s V3 outro visitante grava; visitantes únicos=2 [únicos=%s]', case when u = 2 then 'PASS' else 'FAIL' end, u);

  -- V4: depois de 30 s o mesmo visitante conta de novo
  update public.event_page_views set created_at = now() - interval '31 seconds' where visitor_id = v1;
  perform public.track_event_visit(ev, v1);
  select count(*) into n from public.event_page_views where visitor_id = v1;
  select count(distinct visitor_id) into u from public.event_page_views where event_id = ev and visitor_id in (v1, v2);
  res := res || format('%s V4 após 30 s conta nova visualização, mas segue 1 visitante único [linhas=%s únicos=%s]', case when n = 2 and u = 2 then 'PASS' else 'FAIL' end, n, u);

  -- V5: função antiga continua funcionando (visitor_id nulo)
  select count(*) into n from public.event_page_views where event_id = ev and visitor_id is null and created_at >= now() - interval '1 second';
  perform public.track_event_view(ev);
  select count(*) into n2 from public.event_page_views where event_id = ev and visitor_id is null and created_at >= now() - interval '1 second';
  res := res || format('%s V5 função antiga track_event_view(uuid) continua gravando [%s -> %s]', case when n2 = n + 1 then 'PASS' else 'FAIL' end, n, n2);

  -- V6: evento inexistente, encerrado ou em rascunho: nada é gravado, sem erro
  select count(*) into n from public.event_page_views;
  perform public.track_event_visit(gen_random_uuid(), gen_random_uuid());
  if ev_closed is not null then perform public.track_event_visit(ev_closed, gen_random_uuid()); end if;
  perform public.track_event_visit(ev_draft, gen_random_uuid());
  select count(*) into n2 from public.event_page_views;
  res := res || format('%s V6 evento inexistente, encerrado ou em rascunho não grava [%s -> %s]', case when n2 = n then 'PASS' else 'FAIL' end, n, n2);

  -- V7: teto de 300 por minuto por evento
  insert into public.event_page_views (event_id) select ev from generate_series(1, 300);
  select count(*) into n from public.event_page_views where event_id = ev;
  perform public.track_event_visit(ev, gen_random_uuid());
  select count(*) into n2 from public.event_page_views where event_id = ev;
  res := res || format('%s V7 teto de 300 visitas por minuto por evento [%s -> %s]', case when n2 = n then 'PASS' else 'FAIL' end, n, n2);

  -- V8: segurança de privilégios
  res := res || format('%s V8 anon e logado sem escrita/TRUNCATE/leitura direta na tabela (anon) e sem escrita (logado)',
    case when not has_table_privilege('anon', 'public.event_page_views', 'insert') and not has_table_privilege('anon', 'public.event_page_views', 'update')
          and not has_table_privilege('anon', 'public.event_page_views', 'delete') and not has_table_privilege('anon', 'public.event_page_views', 'truncate')
          and not has_table_privilege('anon', 'public.event_page_views', 'select')
          and not has_table_privilege('authenticated', 'public.event_page_views', 'insert') and not has_table_privilege('authenticated', 'public.event_page_views', 'update')
          and not has_table_privilege('authenticated', 'public.event_page_views', 'delete') and not has_table_privilege('authenticated', 'public.event_page_views', 'truncate')
         then 'PASS' else 'FAIL' end);
  res := res || format('%s V9 visitante e logado podem executar as funções de registro',
    case when has_function_privilege('anon', 'public.track_event_visit(uuid,uuid,text,text,text,text,text)', 'execute')
          and has_function_privilege('authenticated', 'public.track_event_visit(uuid,uuid,text,text,text,text,text)', 'execute')
          and has_function_privilege('anon', 'public.track_event_view(uuid)', 'execute') then 'PASS' else 'FAIL' end);

  -- V10: RLS de leitura (anônimo bloqueado, cliente comum não vê, admin vê)
  PERFORM set_config('request.jwt.claims', '', true);
  SET LOCAL ROLE anon;
  BEGIN
    select count(*) into vistas from public.event_page_views; ok_anon := false;
  EXCEPTION WHEN insufficient_privilege THEN ok_anon := true;
  END;
  RESET ROLE;
  res := res || format('%s V10a visitante anônimo não lê a tabela', case when ok_anon then 'PASS' else 'FAIL' end);

  insert into auth.users (id, aud, role, email, created_at, updated_at) values (cli, 'authenticated', 'authenticated', 't_cli@vis.test', now(), now());
  PERFORM set_config('request.jwt.claims', json_build_object('sub', cli, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  select count(*) into vistas from public.event_page_views;
  RESET ROLE;
  res := res || format('%s V10b cliente comum logado não vê nenhuma visita [viu %s]', case when vistas = 0 then 'PASS' else 'FAIL' end, vistas);

  insert into auth.users (id, aud, role, email, created_at, updated_at) values (adm, 'authenticated', 'authenticated', 't_adm@vis.test', now(), now());
  insert into public.user_roles (user_id, organization_id, role) values (adm, org, 'admin');
  select count(*) into n from public.event_page_views;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', adm, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  select count(*) into vistas from public.event_page_views;
  RESET ROLE;
  res := res || format('%s V10c administrador vê todas as visitas [viu %s de %s]', case when vistas = n and n > 0 then 'PASS' else 'FAIL' end, vistas, n);

  -- V11: histórico antigo preservado (as visitas anteriores ao teste, sem visitor_id, seguem iguais)
  select count(*) into depois_legado from public.event_page_views where visitor_id is null and created_at < now();
  res := res || format('%s V11 visitas antigas preservadas [antes=%s depois=%s]', case when depois_legado = antes_legado then 'PASS' else 'FAIL' end, antes_legado, depois_legado);

  RAISE EXCEPTION E'RESULTADOS rastreamento (tudo desfeito): % PASS / % FAIL\n%',
    (select count(*) from unnest(res) x where x like 'PASS%'), (select count(*) from unnest(res) x where x like 'FAIL%'), array_to_string(res, E'\n');
END $t$;
