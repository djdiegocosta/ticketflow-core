-- Correção de divergência: a versão de checkin_ticket salva na migration
-- 20260903050000_harden_admin_operations.sql referenciava colunas que não existem
-- em checkin_log (ticket_id, checked_by), divergindo da função real em produção.
-- Esta migration é idempotente: recria a função com a definição que já está
-- ativa e funcional, garantindo que um banco novo (a partir do zero das
-- migrations) fique igual ao banco de produção atual.

CREATE OR REPLACE FUNCTION public.checkin_ticket(_ticket_code text)
 RETURNS TABLE(result text, participant_name text, event_title text, checked_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ticket record; v_updated record; v_org_id uuid; v_result text;
  v_participant text; v_event_id uuid;
begin
  v_org_id := public.get_user_organization(auth.uid());

  select t.*, e.title as event_title into v_ticket
  from public.tickets t join public.events e on e.id = t.event_id
  where t.ticket_code = _ticket_code and t.organization_id = v_org_id;

  if v_ticket is null then
    insert into public.checkin_log (organization_id, ticket_code, result, performed_by)
    values (v_org_id, _ticket_code, 'invalido', auth.uid());
    return query select 'invalido', null::text, null::text, null::timestamptz; return;
  end if;

  if v_ticket.status = 'utilizado' then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'duplicidade', auth.uid());
    return query select 'duplicidade', v_ticket.participant_name, v_ticket.event_title, v_ticket.checked_in_at; return;
  end if;

  if v_ticket.status = 'cancelado' then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'invalido', auth.uid());
    return query select 'invalido', v_ticket.participant_name, v_ticket.event_title, null::timestamptz; return;
  end if;

  update public.tickets set status = 'utilizado', checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now()
  where id = v_ticket.id and status = 'valido' returning * into v_updated;

  if v_updated is null then
    insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
    values (v_org_id, v_ticket.event_id, _ticket_code, v_ticket.participant_name, 'duplicidade', auth.uid());
    return query select 'duplicidade', v_ticket.participant_name, v_ticket.event_title, now(); return;
  end if;

  insert into public.checkin_log (organization_id, event_id, ticket_code, participant_name, result, performed_by)
  values (v_org_id, v_ticket.event_id, _ticket_code, v_updated.participant_name, 'sucesso', auth.uid());

  return query select 'sucesso', v_updated.participant_name, v_ticket.event_title, v_updated.checked_in_at;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.checkin_ticket(text) FROM PUBLIC, anon;
