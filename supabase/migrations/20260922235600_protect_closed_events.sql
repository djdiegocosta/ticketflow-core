-- Mantém eventos encerrados e seus lotes históricos imutáveis.
-- O fechamento normal (false -> true) continua permitido pelo trigger.

CREATE OR REPLACE FUNCTION public.prevent_closed_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'events' THEN
    IF TG_OP = 'DELETE' AND OLD.is_closed THEN
      RAISE EXCEPTION 'Evento encerrado não pode ser excluído.';
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.is_closed THEN
      RAISE EXCEPTION 'Evento encerrado não pode ser alterado.';
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_TABLE_NAME = 'ticket_batches' THEN
    IF TG_OP = 'DELETE' AND EXISTS (
      SELECT 1
      FROM public.events
      WHERE id = OLD.event_id
        AND is_closed = true
    ) THEN
      RAISE EXCEPTION 'Lotes de evento encerrado não podem ser excluídos.';
    END IF;

    IF TG_OP = 'UPDATE' AND EXISTS (
      SELECT 1
      FROM public.events
      WHERE id = OLD.event_id
        AND is_closed = true
    ) THEN
      RAISE EXCEPTION 'Lotes de evento encerrado não podem ser alterados.';
    END IF;

    IF TG_OP = 'INSERT' AND EXISTS (
      SELECT 1
      FROM public.events
      WHERE id = NEW.event_id
        AND is_closed = true
    ) THEN
      RAISE EXCEPTION 'Não é permitido criar lote em evento encerrado.';
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_closed_event_mutation ON public.events;
CREATE TRIGGER trg_prevent_closed_event_mutation
BEFORE UPDATE OR DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_mutation();

DROP TRIGGER IF EXISTS trg_prevent_closed_batch_mutation ON public.ticket_batches;
CREATE TRIGGER trg_prevent_closed_batch_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.ticket_batches
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_mutation();
