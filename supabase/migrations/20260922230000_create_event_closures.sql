-- Histórico de Eventos: encerramento e snapshot imutável.
--
-- O fechamento é transacional: consolida vendas já pagas do TicketFlow,
-- recebe os dados que só o produtor conhece e grava um snapshot completo.
-- A tela histórica lê o snapshot, não o estado atual do evento.

create table if not exists public.event_closures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null unique references public.events(id) on delete restrict,
  closed_by uuid null references auth.users(id) on delete set null,
  closed_at timestamptz not null default now(),
  box_office_quantity integer not null default 0 check (box_office_quantity >= 0),
  box_office_revenue numeric(12,2) not null default 0 check (box_office_revenue >= 0),
  courtesies_present integer not null default 0 check (courtesies_present >= 0),
  attendance_present integer not null default 0 check (attendance_present >= 0),
  bar_revenue numeric(12,2) not null default 0 check (bar_revenue >= 0),
  bar_product_cost numeric(12,2) not null default 0 check (bar_product_cost >= 0),
  event_cost numeric(12,2) not null default 0 check (event_cost >= 0),
  notes text null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists event_closures_organization_id_idx
  on public.event_closures(organization_id);

create index if not exists event_closures_closed_at_idx
  on public.event_closures(closed_at desc);

alter table public.event_closures enable row level security;

drop policy if exists "Admins can view event closures" on public.event_closures;

create policy "Admins can view event closures"
on public.event_closures
for select
to authenticated
using (
  (select public.has_role(auth.uid(), 'admin'::public.app_role))
  and organization_id = (select public.get_single_organization_id())
);

revoke insert, update, delete on public.event_closures from anon, authenticated;
grant select on public.event_closures to authenticated;

drop function if exists public.close_event(uuid, integer, numeric, integer, integer, numeric, numeric, numeric, text);

create function public.close_event(
  _event_id uuid,
  _box_office_quantity integer,
  _box_office_revenue numeric,
  _courtesies_present integer,
  _attendance_present integer,
  _bar_revenue numeric,
  _bar_product_cost numeric,
  _event_cost numeric,
  _notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_closed_at timestamptz := now();
  v_presale_quantity integer := 0;
  v_ticket_revenue numeric(12,2) := 0;
  v_bar_revenue numeric(12,2) := round(coalesce(_bar_revenue, 0), 2);
  v_bar_cost numeric(12,2) := round(coalesce(_bar_product_cost, 0), 2);
  v_event_cost numeric(12,2) := round(coalesce(_event_cost, 0), 2);
  v_box_quantity integer := coalesce(_box_office_quantity, 0);
  v_box_revenue numeric(12,2) := round(coalesce(_box_office_revenue, 0), 2);
  v_courtesies integer := coalesce(_courtesies_present, 0);
  v_attendance integer := coalesce(_attendance_present, 0);
  v_total_revenue numeric(12,2);
  v_total_costs numeric(12,2);
  v_net_result numeric(12,2);
  v_margin numeric;
  v_batches jsonb;
  v_snapshot jsonb;
  v_existing uuid;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Sem permissão: apenas administradores podem encerrar eventos';
  end if;

  if v_box_quantity < 0
     or v_box_revenue < 0
     or v_courtesies < 0
     or v_attendance < 0
     or v_bar_revenue < 0
     or v_bar_cost < 0
     or v_event_cost < 0 then
    raise exception 'Os valores do encerramento não podem ser negativos';
  end if;

  select e.*
    into v_event
  from public.events e
  where e.id = _event_id
    and e.organization_id = (select public.get_single_organization_id())
  for update;

  if v_event.id is null then
    raise exception 'Evento não encontrado ou sem acesso';
  end if;

  select ec.id
    into v_existing
  from public.event_closures ec
  where ec.event_id = _event_id;

  if v_existing is not null then
    raise exception 'Este evento já está encerrado';
  end if;

  select
    coalesce(
      sum(s.quantity) filter (
        where s.status = 'pago'::public.sale_status
          and not s.is_courtesy
      ),
      0
    ),
    coalesce(
      sum(s.total_amount) filter (
        where s.status = 'pago'::public.sale_status
          and not s.is_courtesy
      ),
      0
    )
  into v_presale_quantity, v_ticket_revenue
  from public.sales s
  where s.event_id = _event_id
    and s.organization_id = v_event.organization_id;

  v_ticket_revenue := round(v_ticket_revenue, 2);

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', x.batch_id,
        'name', x.batch_name,
        'quantity', x.quantity,
        'unitValue', x.unit_price,
        'revenue', x.revenue
      )
      order by x.created_at
    ),
    '[]'::jsonb
  )
  into v_batches
  from (
    select
      b.id as batch_id,
      b.name as batch_name,
      b.created_at,
      coalesce(
        sum(s.quantity) filter (
          where s.status = 'pago'::public.sale_status
            and not s.is_courtesy
        ),
        0
      )::integer as quantity,
      coalesce(
        case
          when coalesce(
            sum(s.quantity) filter (
              where s.status = 'pago'::public.sale_status
                and not s.is_courtesy
            ),
            0
          ) > 0
          then
            sum(s.total_amount) filter (
              where s.status = 'pago'::public.sale_status
                and not s.is_courtesy
            )
            /
            sum(s.quantity) filter (
              where s.status = 'pago'::public.sale_status
                and not s.is_courtesy
            )
          else 0
        end,
        0
      )::numeric(12,2) as unit_price,
      coalesce(
        sum(s.total_amount) filter (
          where s.status = 'pago'::public.sale_status
            and not s.is_courtesy
        ),
        0
      )::numeric(12,2) as revenue
    from public.ticket_batches b
    left join public.sales s
      on s.batch_id = b.id
      and s.event_id = _event_id
      and s.organization_id = v_event.organization_id
    where b.event_id = _event_id
      and b.organization_id = v_event.organization_id
      and not b.is_courtesy
    group by b.id, b.name, b.created_at
    having coalesce(
      sum(s.quantity) filter (
        where s.status = 'pago'::public.sale_status
          and not s.is_courtesy
      ),
      0
    ) > 0
  ) x;

  v_total_revenue := round(v_ticket_revenue + v_box_revenue + v_bar_revenue, 2);
  v_total_costs := round(v_event_cost + v_bar_cost, 2);
  v_net_result := round(v_total_revenue - v_total_costs, 2);
  v_margin := case
    when v_total_revenue > 0
      then round((v_net_result / v_total_revenue) * 100, 2)
    else 0
  end;

  v_snapshot := jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'date', v_event.event_date,
      'venue', v_event.location,
      'imageUrl', v_event.image_url
    ),
    'closedAt', v_closed_at,
    'audience', jsonb_build_object(
      'presale', v_presale_quantity,
      'boxOffice', v_box_quantity,
      'courtesies', v_courtesies,
      'paidTickets', v_presale_quantity + v_box_quantity,
      'attendancePresent', v_attendance
    ),
    'boxOfficeSale', jsonb_build_object(
      'quantity', v_box_quantity,
      'revenue', v_box_revenue
    ),
    'batches', v_batches,
    'finance', jsonb_build_object(
      'ticketsRevenue', v_ticket_revenue + v_box_revenue,
      'barRevenue', v_bar_revenue,
      'totalRevenue', v_total_revenue,
      'eventCost', v_event_cost,
      'barCost', v_bar_cost,
      'totalCosts', v_total_costs,
      'netResult', v_net_result,
      'margin', v_margin
    ),
    'bar', jsonb_build_object(
      'totalSales', v_bar_revenue,
      'productCost', v_bar_cost,
      'grossResult', round(v_bar_revenue - v_bar_cost, 2),
      'costPercent', case
        when v_bar_revenue > 0
          then round((v_bar_cost / v_bar_revenue) * 100, 2)
        else 0
      end
    ),
    'notes', nullif(trim(_notes), '')
  );

  insert into public.event_closures (
    organization_id,
    event_id,
    closed_by,
    closed_at,
    box_office_quantity,
    box_office_revenue,
    courtesies_present,
    attendance_present,
    bar_revenue,
    bar_product_cost,
    event_cost,
    notes,
    snapshot
  )
  values (
    v_event.organization_id,
    _event_id,
    auth.uid(),
    v_closed_at,
    v_box_quantity,
    v_box_revenue,
    v_courtesies,
    v_attendance,
    v_bar_revenue,
    v_bar_cost,
    v_event_cost,
    nullif(trim(_notes), ''),
    v_snapshot
  );

  update public.events
  set
    is_closed = true,
    closed_at = v_closed_at,
    updated_at = v_closed_at
  where id = _event_id;

  return v_snapshot;
end;
$$;

revoke execute on function public.close_event(uuid, integer, numeric, integer, integer, numeric, numeric, numeric, text)
  from public, anon;

grant execute on function public.close_event(uuid, integer, numeric, integer, integer, numeric, numeric, numeric, text)
  to authenticated;
