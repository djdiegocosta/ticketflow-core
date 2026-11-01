-- TicketFlow Insights — Etapa 1: definições e limpeza de dados.
--
-- 1) sales.is_test: marca vendas de TESTE (assistente do Mercado Pago). O Insights as exclui.
--    Backfill: sale_code começando com 'TEST' (hoje só TEST1D58EE2D). create_mp_test_sale passa a marcar sozinha.
-- 2) events.sales_open_at: abertura REAL das vendas. A data dos lotes não serve: ela é regravada quando um lote
--    é editado (no e-o-beat, 12 vendas aconteceram antes do início "oficial" do lote).
--    Backfill: e-o-beat = momento da criação do evento (confirmado pelo dono: "abriu as vendas ao criar o evento",
--    08/09/2026); demais eventos = menor início entre os lotes de venda.
-- 3) event_sales_open_at(): regra efetiva = sales_open_at, senão menor início dos lotes de venda, senão criação.
--
-- Só adiciona colunas e uma função; nenhum dado existente é apagado. O XP NÃO é alterado por esta migration
-- (o bônus de "primeiro dia" continua usando a data dos lotes até decisão do dono).

alter table public.sales add column if not exists is_test boolean not null default false;
update public.sales set is_test = true where sale_code like 'TEST%' and not is_test;

alter table public.events add column if not exists sales_open_at timestamptz;

-- Evento encerrado é imutável (trg_prevent_closed_event_update). A abertura das vendas é dado de ANÁLISE,
-- não financeiro nem do fechamento: fica fora do bloqueio, para o backfill funcionar e para permitir corrigir
-- a data de um evento já encerrado. Todo o resto do evento encerrado continua protegido.
create or replace function public.prevent_closed_event_update()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
DECLARE
  v_old public.events%rowtype;
  v_new public.events%rowtype;
BEGIN
  IF NOT OLD.is_closed THEN
    RETURN NEW;
  END IF;

  v_old := OLD;
  v_new := NEW;
  v_new.closed_at := v_old.closed_at;
  v_new.updated_at := v_old.updated_at;
  v_new.sales_open_at := v_old.sales_open_at;

  IF v_new IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'Evento encerrado não pode ser alterado.';
  END IF;

  RETURN NEW;
END;
$function$;

update public.events e set sales_open_at = e.created_at
where e.slug = 'e-o-beat' and e.sales_open_at is null;

update public.events e set sales_open_at = (
  select min(b.starts_at) from public.ticket_batches b
  where b.event_id = e.id and not b.is_courtesy and b.starts_at is not null
)
where e.sales_open_at is null
  and exists (
    select 1 from public.ticket_batches b
    where b.event_id = e.id and not b.is_courtesy and b.starts_at is not null
  );

create or replace function public.event_sales_open_at(_event_id uuid)
returns timestamptz
language sql
stable
set search_path = public
as $fn$
  select coalesce(
    e.sales_open_at,
    (select min(b.starts_at) from public.ticket_batches b
      where b.event_id = e.id and not b.is_courtesy and b.starts_at is not null),
    e.created_at
  )
  from public.events e
  where e.id = _event_id;
$fn$;

revoke all on function public.event_sales_open_at(uuid) from public, anon;
grant execute on function public.event_sales_open_at(uuid) to authenticated, service_role;

-- O assistente de teste do Mercado Pago passa a marcar a venda como teste (único ajuste: is_test = true).
create or replace function public.create_mp_test_sale(_organization_id uuid)
returns table(sale_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_event_id uuid;
  v_batch_id uuid;
  v_sale_id uuid;
  v_expiration_minutes integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin')
     or public.get_user_organization(auth.uid()) != _organization_id then
    raise exception 'Sem permissão';
  end if;

  select e.id, b.id into v_event_id, v_batch_id
  from public.events e
  join public.ticket_batches b on b.event_id = e.id
  where e.organization_id = _organization_id
  order by e.created_at
  limit 1;

  if v_event_id is null then
    raise exception 'Crie um evento com pelo menos um lote antes de testar o pagamento';
  end if;

  select pending_sale_expiration_minutes into v_expiration_minutes from public.organizations where id = _organization_id;
  v_expiration_minutes := coalesce(v_expiration_minutes, 30);

  insert into public.sales (
    organization_id, event_id, batch_id, quantity, unit_price, total_amount,
    status, buyer_name, buyer_email, buyer_whatsapp, payment_method,
    sale_code, origin, verification_type, created_by, expires_at, is_test
  )
  values (
    _organization_id, v_event_id, v_batch_id, 1, 0.01, 0.01,
    'pendente', 'Teste TicketFlow', 'teste@ticketflow.com', '5511999999999',
    'pix_ticketflow', 'TEST' || public.generate_short_code(), 'manual',
    'manual_admin', auth.uid(), now() + make_interval(mins => v_expiration_minutes), true
  )
  returning id into v_sale_id;

  return query select v_sale_id;
end;
$function$;
