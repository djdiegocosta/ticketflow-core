-- AUD-005: reconcile pending-sale expiration flow with production.
-- Keeps stock restoration per expired sale and the 1-minute cron job.
CREATE OR REPLACE FUNCTION public.expire_pending_sales_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale record;
BEGIN
  FOR v_sale IN
    SELECT id, batch_id, quantity
    FROM public.sales
    WHERE status = 'pendente'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    ORDER BY expires_at
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.ticket_batches
    SET quantity = quantity + v_sale.quantity
    WHERE id = v_sale.batch_id
      AND quantity IS NOT NULL;

    UPDATE public.sales
    SET status = 'expirado', updated_at = now()
    WHERE id = v_sale.id
      AND status = 'pendente';
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.expire_pending_sales()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.expire_pending_sales_job();
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-pending-sales') THEN
    PERFORM cron.unschedule('expire-pending-sales');
  END IF;
  PERFORM cron.schedule('expire-pending-sales', '* * * * *', 'SELECT expire_pending_sales_job()');
END;
$$;