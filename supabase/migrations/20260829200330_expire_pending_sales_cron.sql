-- Ativa extensão pg_cron (supabase cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove schedule anterior via drop da wrapper (idempotente, não precisa de permissão em cron.job)
DROP FUNCTION IF EXISTS expire_pending_sales_job();

-- Cria wrapper function (nome único para evitar conflito)
CREATE OR REPLACE FUNCTION expire_pending_sales_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  UPDATE sales
  SET
    status = 'expirado',
    updated_at = NOW()
  WHERE
    status = 'pendente'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;

-- Agenda: roda a cada 1 minuto
SELECT cron.schedule(
  'expire-pending-sales',
  '* * * * *',
  $$SELECT expire_pending_sales_job()$$
);
