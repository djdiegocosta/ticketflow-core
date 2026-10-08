-- Security Advisor (07/10/2026): funcoes internas expostas pela API.
-- Gatilhos: so o proprio banco os dispara; ninguem precisa chama-los de fora.
-- O EXECUTE de uma funcao de gatilho e checado apenas na criacao do gatilho,
-- entao fechar o acesso nao afeta o funcionamento deles.
REVOKE EXECUTE ON FUNCTION public.grant_xp_new_account() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_xp_on_checkin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_xp_on_sale_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_single_active_banner() FROM PUBLIC, anon, authenticated;

-- Depende de auth.uid(): visitante sem login nunca teria o que vincular.
-- Continua liberada para usuario logado.
REVOKE EXECUTE ON FUNCTION public.link_guest_purchases_to_current_customer() FROM PUBLIC, anon;
