-- TicketFlow Insights — Etapa 2: rastreamento de visitantes da página pública do evento.
--
-- O que muda:
--  1) event_page_views ganha colunas (todas opcionais, então as 1.754 visitas antigas continuam
--     intactas): visitor_id (identificador anônimo sorteado no navegador), referrer_host (site de
--     origem), utm_source/medium/campaign e link_code (código ?ref= do link de venda).
--  2) Nova função track_event_visit(...): só registra eventos PUBLICADOS e abertos, ignora repetição
--     do mesmo visitante em menos de 30 s e tem teto por evento (300 visitas/minuto) contra abuso.
--  3) track_event_view(uuid), usada por páginas ainda em cache no navegador, passa a usar a mesma
--     validação (mesma assinatura, sem quebrar nada).
--  4) Segurança: visitante anônimo e usuário logado perdem todo acesso direto à tabela (hoje tinham
--     até TRUNCATE; só a regra de linhas segurava). Leitura continua só para administrador (policy
--     existente), escrita só pelas funções acima.
--  5) Índices por evento+data e evento+visitante, para os cálculos do Insights.
--
-- Definições: "visualização" = carregamento da página (sem repetição em 30 s do mesmo visitante);
-- "visitante único" = visitor_id distinto. Visitas antigas não têm visitor_id e não contam como únicos.
-- Nada de IP, impressão digital do aparelho ou dado pessoal é guardado.

alter table public.event_page_views
  add column if not exists visitor_id uuid,
  add column if not exists referrer_host text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists link_code text;

create index if not exists event_page_views_event_created_idx
  on public.event_page_views (event_id, created_at);
create index if not exists event_page_views_event_visitor_idx
  on public.event_page_views (event_id, visitor_id, created_at) where visitor_id is not null;

-- SECURITY DEFINER é necessário: o visitante anônimo não pode escrever na tabela. search_path fixo.
create or replace function public.track_event_visit(
  _event_id uuid,
  _visitor_id uuid default null,
  _referrer_host text default null,
  _utm_source text default null,
  _utm_medium text default null,
  _utm_campaign text default null,
  _link_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c_repeat_window constant interval := interval '30 seconds';
  c_max_per_minute constant integer := 300;
begin
  -- Só evento publicado e aberto (não revela se o id existe: sai em silêncio).
  if not exists (
    select 1 from public.events e
    where e.id = _event_id and e.status = 'publicado' and not e.is_closed
  ) then
    return;
  end if;

  -- Mesmo visitante recarregando a página: conta uma vez a cada 30 s.
  if _visitor_id is not null and exists (
    select 1 from public.event_page_views v
    where v.event_id = _event_id and v.visitor_id = _visitor_id
      and v.created_at > now() - c_repeat_window
  ) then
    return;
  end if;

  -- Teto por evento: tráfego anormal não infla a tabela.
  if (select count(*) from public.event_page_views v
      where v.event_id = _event_id and v.created_at > now() - interval '1 minute') >= c_max_per_minute then
    return;
  end if;

  insert into public.event_page_views
    (event_id, visitor_id, referrer_host, utm_source, utm_medium, utm_campaign, link_code)
  values (
    _event_id,
    _visitor_id,
    left(lower(nullif(btrim(_referrer_host), '')), 100),
    left(lower(nullif(btrim(_utm_source), '')), 100),
    left(lower(nullif(btrim(_utm_medium), '')), 100),
    left(lower(nullif(btrim(_utm_campaign), '')), 100),
    left(lower(nullif(btrim(_link_code), '')), 100)
  );
end;
$fn$;

revoke all on function public.track_event_visit(uuid, uuid, text, text, text, text, text) from public;
grant execute on function public.track_event_visit(uuid, uuid, text, text, text, text, text) to anon, authenticated;

-- Função antiga (mesma assinatura): páginas em cache continuam funcionando, agora com a validação nova.
create or replace function public.track_event_view(_event_id uuid)
returns void
language sql
security definer
set search_path = public
as $fn$
  select public.track_event_visit(_event_id);
$fn$;

-- Sem acesso direto à tabela para anon/authenticated; leitura só via policy de administrador.
revoke all on table public.event_page_views from anon, authenticated;
grant select on table public.event_page_views to authenticated;
