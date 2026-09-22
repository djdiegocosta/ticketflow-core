-- Isola o check-in pelo evento operacional informado pelo cliente.
-- A função existente checkin_ticket(text) permanece para compatibilidade.
-- Esta variante rejeita tickets de outro evento e eventos encerrados.

CREATE OR REPLACE FUNCTION public.checkin_ticket_for_event(
  _ticket_code text,
  _event_id uuid
)
RETURNS TABLE(
  result text,
  participant_name text,
  event_title text,
  checked_in_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_ticket record;
  v_updated record;
BEGIN
  v_org_id := public.get_user_organization(auth.uid());

  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT 'invalido', NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  -- O evento usado no check-in precisa pertencer à organização e estar
  -- publicado e aberto. Um evento encerrado nunca pode voltar a operar.
  IF NOT EXISTS (
    SELECT 1
    FROM public.events e
    WHERE e.id = _event_id
      AND e.organization_id = v_org_id
      AND e.status = 'publicado'
      AND e.is_closed = false
  ) THEN
    INSERT INTO public.checkin_log (
      organization_id,
      event_id,
      ticket_code,
      result,
      performed_by
    )
    VALUES (
      v_org_id,
      _event_id,
      _ticket_code,
      'invalido',
      auth.uid()
    );

    RETURN QUERY SELECT 'invalido', NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT
    t.*,
    e.title AS event_title
  INTO v_ticket
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.ticket_code = _ticket_code
    AND t.event_id = _event_id
    AND t.organization_id = v_org_id;

  IF v_ticket IS NULL THEN
    INSERT INTO public.checkin_log (
      organization_id,
      event_id,
      ticket_code,
      result,
      performed_by
    )
    VALUES (
      v_org_id,
      _event_id,
      _ticket_code,
      'invalido',
      auth.uid()
    );

    RETURN QUERY SELECT 'invalido', NULL::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_ticket.status = 'utilizado' THEN
    INSERT INTO public.checkin_log (
      organization_id,
      event_id,
      ticket_code,
      participant_name,
      result,
      performed_by
    )
    VALUES (
      v_org_id,
      _event_id,
      _ticket_code,
      v_ticket.participant_name,
      'duplicidade',
      auth.uid()
    );

    RETURN QUERY
      SELECT 'duplicidade', v_ticket.participant_name, v_ticket.event_title, v_ticket.checked_in_at;
    RETURN;
  END IF;

  IF v_ticket.status = 'cancelado' THEN
    INSERT INTO public.checkin_log (
      organization_id,
      event_id,
      ticket_code,
      participant_name,
      result,
      performed_by
    )
    VALUES (
      v_org_id,
      _event_id,
      _ticket_code,
      v_ticket.participant_name,
      'invalido',
      auth.uid()
    );

    RETURN QUERY
      SELECT 'invalido', v_ticket.participant_name, v_ticket.event_title, NULL::timestamptz;
    RETURN;
  END IF;

  UPDATE public.tickets
  SET
    status = 'utilizado',
    checked_in_at = now(),
    checked_in_by = auth.uid(),
    updated_at = now()
  WHERE id = v_ticket.id
    AND event_id = _event_id
    AND status = 'valido'
  RETURNING * INTO v_updated;

  IF v_updated IS NULL THEN
    INSERT INTO public.checkin_log (
      organization_id,
      event_id,
      ticket_code,
      participant_name,
      result,
      performed_by
    )
    VALUES (
      v_org_id,
      _event_id,
      _ticket_code,
      v_ticket.participant_name,
      'duplicidade',
      auth.uid()
    );

    RETURN QUERY
      SELECT 'duplicidade', v_ticket.participant_name, v_ticket.event_title, now();
    RETURN;
  END IF;

  INSERT INTO public.checkin_log (
    organization_id,
    event_id,
    ticket_code,
    participant_name,
    result,
    performed_by
  )
  VALUES (
    v_org_id,
    _event_id,
    _ticket_code,
    v_updated.participant_name,
    'sucesso',
    auth.uid()
  );

  RETURN QUERY
    SELECT 'sucesso', v_updated.participant_name, v_ticket.event_title, v_updated.checked_in_at;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.checkin_ticket_for_event(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.checkin_ticket_for_event(text, uuid) TO authenticated;
