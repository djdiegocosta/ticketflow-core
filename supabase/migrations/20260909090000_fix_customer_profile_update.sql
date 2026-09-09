-- Corrige a RPC usada pela área /cliente/perfil.
-- A assinatura vigente possui 8 argumentos; a migration de hardening
-- anterior revogava uma assinatura antiga de 7 argumentos.
-- Também permite limpar campos opcionais sem preservar silenciosamente o valor antigo.

DROP FUNCTION IF EXISTS public.update_customer(uuid, text, text, text, text, date, text, public.customer_gender);

CREATE FUNCTION public.update_customer(
  _customer_id uuid,
  _full_name text,
  _whatsapp text,
  _email text,
  _cidade text DEFAULT NULL::text,
  _data_nascimento date DEFAULT NULL::date,
  _instagram text DEFAULT NULL::text,
  _sexo public.customer_gender DEFAULT NULL::public.customer_gender
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_user_id uuid;
  v_org_id uuid;
BEGIN
  SELECT user_id, organization_id
    INTO v_owner_user_id, v_org_id
  FROM public.customers
  WHERE id = _customer_id;

  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  IF v_owner_user_id IS DISTINCT FROM auth.uid()
     AND NOT (
       public.has_role(auth.uid(), 'admin')
       AND v_org_id = public.get_user_organization(auth.uid())
     ) THEN
    RAISE EXCEPTION 'Sem permissão para editar este cliente';
  END IF;

  UPDATE public.customers
  SET full_name = trim(_full_name),
      whatsapp = trim(_whatsapp),
      email = lower(trim(_email)),
      cidade = NULLIF(trim(_cidade), ''),
      data_nascimento = _data_nascimento,
      instagram = NULLIF(trim(_instagram), ''),
      sexo = _sexo,
      updated_at = now()
  WHERE id = _customer_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_customer(uuid, text, text, text, text, date, text, public.customer_gender) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_customer(uuid, text, text, text, text, date, text, public.customer_gender) TO authenticated;
