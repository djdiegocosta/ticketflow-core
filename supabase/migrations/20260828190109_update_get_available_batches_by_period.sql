-- Atualiza a função get_available_batches para filtrar lotes vigentes
-- com base na data/hora atual (starts_at <= now <= ends_at)

CREATE OR REPLACE FUNCTION get_available_batches(_event_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  price numeric,
  quantity integer,
  starts_at timestamptz,
  ends_at timestamptz,
  is_courtesy boolean,
  event_id uuid,
  organization_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tb.id,
    tb.name,
    tb.price,
    tb.quantity,
    tb.starts_at,
    tb.ends_at,
    tb.is_courtesy,
    tb.event_id,
    tb.organization_id,
    tb.created_at,
    tb.updated_at
  FROM ticket_batches tb
  INNER JOIN events e ON e.id = tb.event_id
  WHERE tb.event_id = _event_id
    AND e.status = 'publicado'
    AND e.is_closed = false
    -- Lote vigente: agora está no período configurado
    AND (tb.starts_at IS NULL OR tb.starts_at <= now())
    AND (tb.ends_at IS NULL OR tb.ends_at >= now())
  ORDER BY tb.starts_at ASC NULLS FIRST, tb.created_at ASC;
END;
$$;
