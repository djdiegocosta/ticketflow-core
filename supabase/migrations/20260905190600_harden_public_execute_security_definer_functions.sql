-- AUD-001: remove anonymous/public execution from privileged SECURITY DEFINER RPCs.
-- Public checkout/read functions remain intentionally callable by anon.

REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_sale(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.checkin_ticket(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_courtesy(uuid, uuid, text[], uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_manual_sale(uuid, uuid, text, text, integer, text[], numeric, public.payment_method, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_mp_test_sale(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_courtesy_ticket(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_event(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.draw_raffle_winner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_single_active_banner() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_direct_sales_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_customer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_link_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_single_organization_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_organization(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invite_user(text, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_sale(uuid, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_user_or_invite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_courtesy_participant(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_customer(uuid, text, text, text, text, date, text, public.customer_gender) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_organization_profile(uuid, text, text, text, text) FROM PUBLIC, anon;

-- Intentionally public/customer-facing SECURITY DEFINER functions are not
-- revoked here because the public purchase and ticket-consultation flows
-- depend on them:
-- create_pending_sale
-- get_available_batches
-- get_available_batches_active
-- get_customer_organization_design
-- get_default_organization
-- get_public_organization_design
-- get_sale_by_code
-- get_tickets_by_sale_code
-- signup_customer
-- track_checkout_abandonment
