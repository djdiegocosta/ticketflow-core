-- Security hardening for the public/customer flow.
-- Public checkout must use only intentionally public reads/RPCs.
-- Privileged payment/ticket mutations are service-role only.

REVOKE ALL ON FUNCTION public.confirm_sale_paid(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_locked_tickets(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) TO service_role;

DROP POLICY IF EXISTS "Public can only read their own sales by code" ON public.sales;
DROP POLICY IF EXISTS "Public can only read their own tickets by sale" ON public.tickets;
DROP POLICY IF EXISTS "No direct insert on sales" ON public.sales;
DROP POLICY IF EXISTS "No direct insert on tickets" ON public.tickets;

CREATE POLICY "Authenticated admins can read organization sales"
ON public.sales FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "Authenticated admins can read organization tickets"
ON public.tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND organization_id = public.get_user_organization(auth.uid()));

CREATE POLICY "No direct insert on sales" ON public.sales FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No direct insert on tickets" ON public.tickets FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "No direct update on sales" ON public.sales FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct delete on sales" ON public.sales FOR DELETE TO anon, authenticated USING (false);
CREATE POLICY "No direct update on tickets" ON public.tickets FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No direct delete on tickets" ON public.tickets FOR DELETE TO anon, authenticated USING (false);

-- Public visibility is limited to published, open events and their batches.
DROP POLICY IF EXISTS "Público vê eventos publicados" ON public.events;
CREATE POLICY "Public can read published events" ON public.events FOR SELECT TO anon, authenticated
USING (status = 'publicado'::event_status AND NOT is_closed);
DROP POLICY IF EXISTS "Público vê lotes de eventos publicados" ON public.ticket_batches;
CREATE POLICY "Public can read batches of published events" ON public.ticket_batches FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_batches.event_id AND e.status = 'publicado'::event_status AND NOT e.is_closed));

-- Payment confirmation is idempotent: only a pending sale can transition to paid.
DROP FUNCTION IF EXISTS public.confirm_sale_paid(uuid, text);
CREATE FUNCTION public.confirm_sale_paid(_sale_id uuid, _mp_payment_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  changed boolean;
BEGIN
  UPDATE public.sales
  SET status = 'pago', mp_payment_id = _mp_payment_id, updated_at = now()
  WHERE id = _sale_id AND status = 'pendente' AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS changed = ROW_COUNT > 0;
  RETURN changed;
END;
$function$;
REVOKE ALL ON FUNCTION public.confirm_sale_paid(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;
