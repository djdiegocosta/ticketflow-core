-- A confirmação de pagamento (webhook do Mercado Pago) passa a gravar a data/hora
-- do pagamento em sales.paid_at. Antes o campo ficava vazio nas vendas online pagas.
CREATE OR REPLACE FUNCTION public.confirm_sale_paid(_sale_id uuid, _mp_payment_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changed integer;
BEGIN
  UPDATE public.sales
  SET status = 'pago', mp_payment_id = _mp_payment_id, paid_at = COALESCE(paid_at, now()), updated_at = now()
  WHERE id = _sale_id
    AND status = 'pendente'
    AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed > 0;
END;
$function$;
