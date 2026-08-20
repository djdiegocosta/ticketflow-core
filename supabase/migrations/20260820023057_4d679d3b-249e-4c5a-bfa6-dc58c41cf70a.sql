
-- 1. DROP FUNCTION se existir
DROP FUNCTION IF EXISTS public.expire_pending_sales();

-- 2. Criar função de expiração com status 'expirado'
CREATE OR REPLACE FUNCTION public.expire_pending_sales()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.sales
    SET status = 'expirado'
    WHERE status = 'pendente'
      AND expires_at < now();
END;
$$;

-- 3. Adicionar RPC para picos por horário
CREATE OR REPLACE FUNCTION public.get_hourly_sales_stats(_event_id uuid DEFAULT NULL)
RETURNS TABLE (hour text, value integer)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        to_char(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo', 'HH24"h"') as hour,
        count(*)::integer as value
    FROM public.sales
    WHERE 
        (_event_id IS NULL OR event_id = _event_id)
        AND status = 'pago'
    GROUP BY 1
    ORDER BY 1;
$$;

-- 4. RPC para contagem de novos clientes (Usando created_at como fallback caso account_created_at ainda não tenha sido migrado por completo)
CREATE OR REPLACE FUNCTION public.get_new_customers_count(_days integer)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
    SELECT count(*)::integer
    FROM public.customers
    WHERE created_at >= (now() - (_days || ' days')::interval);
$$;
