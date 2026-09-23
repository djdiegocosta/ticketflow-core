-- Completa a proteção de lotes: impedir também mover um lote de evento aberto
-- para um evento já encerrado.
CREATE OR REPLACE FUNCTION public.prevent_closed_batch_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_target_event uuid;
BEGIN
  v_target_event := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.event_id
    ELSE NEW.event_id
  END;

  IF TG_OP = 'UPDATE'
     AND (
       EXISTS (SELECT 1 FROM public.events WHERE id = OLD.event_id AND is_closed = true)
       OR EXISTS (SELECT 1 FROM public.events WHERE id = NEW.event_id AND is_closed = true)
     ) THEN
    RAISE EXCEPTION 'Lotes vinculados a evento encerrado não podem ser alterados.';
  END IF;

  IF TG_OP = 'INSERT'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = v_target_event AND is_closed = true) THEN
    RAISE EXCEPTION 'Não é permitido criar lote em evento encerrado.';
  END IF;

  IF TG_OP = 'DELETE'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = v_target_event AND is_closed = true) THEN
    RAISE EXCEPTION 'Lotes de evento encerrado não podem ser excluídos.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;
