-- Congela dados operacionais filhos quando o evento é encerrado.
-- Isso impede alterações em links de venda e checklist de eventos históricos.

CREATE OR REPLACE FUNCTION public.prevent_closed_event_child_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
BEGIN
  v_event_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.event_id
    ELSE NEW.event_id
  END;

  IF TG_OP = 'UPDATE'
     AND (
       EXISTS (SELECT 1 FROM public.events WHERE id = OLD.event_id AND is_closed = true)
       OR EXISTS (SELECT 1 FROM public.events WHERE id = NEW.event_id AND is_closed = true)
     ) THEN
    RAISE EXCEPTION 'Registro vinculado a evento encerrado não pode ser alterado.';
  END IF;

  IF TG_OP = 'INSERT'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = v_event_id AND is_closed = true) THEN
    RAISE EXCEPTION 'Não é permitido criar registro em evento encerrado.';
  END IF;

  IF TG_OP = 'DELETE'
     AND EXISTS (SELECT 1 FROM public.events WHERE id = v_event_id AND is_closed = true) THEN
    RAISE EXCEPTION 'Registro de evento encerrado não pode ser excluído.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_closed_sales_link_mutation ON public.sales_links;
CREATE TRIGGER trg_prevent_closed_sales_link_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.sales_links
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_child_mutation();

DROP TRIGGER IF EXISTS trg_prevent_closed_checklist_mutation ON public.event_checklist_items;
CREATE TRIGGER trg_prevent_closed_checklist_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.event_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_event_child_mutation();
