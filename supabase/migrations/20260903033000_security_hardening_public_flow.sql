-- Security hardening for the public/customer flow.
-- Public checkout must use only the intentionally public RPCs.
-- Privileged payment/ticket mutations must never be callable by anon.

REVOKE ALL ON FUNCTION public.confirm_sale_paid(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_locked_tickets(uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- These functions are internal privileged operations. Keep execution restricted
-- to service_role (webhook/backend), never to browser clients.
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) TO service_role;

-- Do not expose customer/sales/tickets through direct anonymous SELECT.
-- Public pages must use purpose-built RPCs that return only the required fields.
DROP POLICY IF EXISTS "Public can only read their own sales by code" ON public.sales;
DROP POLICY IF EXISTS "Public can only read their own tickets by sale" ON public.tickets;
DROP POLICY IF EXISTS "No direct insert on sales" ON public.sales;
DROP POLICY IF EXISTS "No direct insert on tickets" ON public.tickets;

-- No direct browser reads/writes on financial/ticket records.
CREATE POLICY "Authenticated admins can read organization sales"
ON public.sales FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "Authenticated admins can read organization tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  AND organization_id = public.get_user_organization(auth.uid())
);

CREATE POLICY "No direct insert on sales"
ON public.sales FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct insert on tickets"
ON public.tickets FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No direct update on sales"
ON public.sales FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct delete on sales"
ON public.sales FOR DELETE
TO anon, authenticated
USING (false);

CREATE POLICY "No direct update on tickets"
ON public.tickets FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No direct delete on tickets"
ON public.tickets FOR DELETE
TO anon, authenticated
USING (false);

-- Payment confirmation is authoritative only when the server has verified
-- the payment with Mercado Pago. The webhook/backend is the only caller.
CREATE OR REPLACE FUNCTION public.confirm_sale_paid(_sale_id uuid, _mp_payment_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.sales
  SET status = 'pago',
      mp_payment_id = _mp_payment_id,
      updated_at = now()
  WHERE id = _sale_id
    AND status = 'pendente';
END;
$function$;
