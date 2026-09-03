CREATE INDEX IF NOT EXISTS sales_pending_expires_idx ON public.sales (status, expires_at) WHERE status = 'pendente';

CREATE OR REPLACE FUNCTION public.expire_pending_sales_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.expire_pending_sales()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.expire_pending_sales_job();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_pending_sales_job() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_pending_sales() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales_job() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_pending_sales() TO service_role;
