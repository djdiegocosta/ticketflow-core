
-- Revogar acesso público às funções críticas de Service Role
REVOKE EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Garantir acesso apenas à service_role
GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) TO service_role;
