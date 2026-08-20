
-- 1. Tabela de configuração do Mercado Pago
CREATE TABLE IF NOT EXISTS public.mp_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    environment text NOT NULL CHECK (environment IN ('sandbox', 'producao')),
    public_key text NOT NULL,
    access_token_encrypted text NOT NULL,
    webhook_secret_encrypted text,
    validated_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (organization_id, environment)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_config TO authenticated;
GRANT ALL ON public.mp_config TO service_role;

ALTER TABLE public.mp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their organization's mp_config"
ON public.mp_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
));

-- 2. Coluna para nomes de participantes pendentes em sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pending_participant_names jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS mp_payment_id text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS mp_qr_code text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS mp_qr_code_base64 text;

-- 3. RPC confirm_sale_paid
CREATE OR REPLACE FUNCTION public.confirm_sale_paid(
    _sale_id uuid,
    _mp_payment_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.sales
    SET status = 'pago',
        mp_payment_id = _mp_payment_id,
        updated_at = now()
    WHERE id = _sale_id AND status = 'pendente';
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_sale_paid(uuid, text) TO service_role;

-- 4. RPC para gerar tickets bloqueados (chamada pelo webhook após confirmação)
CREATE OR REPLACE FUNCTION public.create_locked_tickets(
    _sale_id uuid,
    _participant_names jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale record;
    v_i integer;
    v_names text[];
BEGIN
    SELECT * INTO v_sale FROM public.sales WHERE id = _sale_id;
    IF NOT FOUND THEN RETURN; END IF;

    -- Converter jsonb para array de text
    SELECT array_agg(x)::text[] INTO v_names FROM jsonb_array_elements_text(_participant_names) x;

    -- Deletar tickets pendentes se existirem (limpeza)
    DELETE FROM public.tickets WHERE sale_id = _sale_id;

    -- Criar Tickets oficiais
    FOR v_i IN 1..array_length(v_names, 1) LOOP
        INSERT INTO public.tickets (
            organization_id,
            event_id,
            batch_id,
            sale_id,
            participant_name,
            ticket_code,
            status
        )
        values (
            v_sale.organization_id,
            v_sale.event_id,
            v_sale.batch_id,
            _sale_id,
            trim(v_names[v_i]),
            v_sale.sale_code || '-' || v_i,
            'valido'
        );
    END LOOP;

    -- Limpar coluna temporária
    UPDATE public.sales SET pending_participant_names = NULL WHERE id = _sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_locked_tickets(uuid, jsonb) TO service_role;
