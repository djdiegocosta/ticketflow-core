-- Eventos encerrados e seus lotes tornam-se imutáveis.
-- A única atualização ainda permitida em um evento já encerrado é a
-- atualização técnica de closed_at/updated_at usada para completar um
-- histórico legado sem closure registrada.

CREATE OR REPLACE FUNCTION public.prevent_closed_event_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
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

  IF v_new IS DISTINCT FROM v_old THEN
    RAISE EXCEPTION 'Evento encerrado não pode ser alterado.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_closed_event_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.is_closed THEN
    RAISE EXCEPTION 'Evento encerrado não pode ser excluído.';
  END IF;

  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_closed_batch_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  v_event_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;

  IF TG_OP = 'DELETE'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = v_event_id AND is_closed = true) THEN
    RAISE EXCEPTION 'Lotes de evento encerrado não podem ser excluídos.';
  END IF;

  IF TG_OP = 'UPDATE'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = OLD.event_id AND is_closed = true) THEN
    RAISE EXCEPTION 'Lotes de evento encerrado não podem ser alterados.';
  END IF;

  IF TG_OP = 'INSERT'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = NEW.event_id AND is_closed = true) THEN
    RAISE EXCEPTION 'Não é permitido criar lote em evento encerrado.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_closed_event_update ON public.events;
CREATE TRIGGER trg_prevent_closed_event_update
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_update();

DROP TRIGGER IF EXISTS trg_prevent_closed_event_delete ON public.events;
CREATE TRIGGER trg_prevent_closed_event_delete
BEFORE DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_delete();

DROP TRIGGER IF EXISTS trg_prevent_closed_batch_mutation ON public.ticket_batches;
CREATE TRIGGER trg_prevent_closed_batch_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.ticket_batches
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_batch_mutation();
