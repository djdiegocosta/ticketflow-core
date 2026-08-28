-- Migration: Add get_available_batches_active function
-- Author: Nexus
-- Description: Creates a new function that returns only batches where the current
--              time (now()) is between starts_at and ends_at. Batches with null
--              starts_at or ends_at are considered always available.

CREATE OR REPLACE FUNCTION get_available_batches_active(_event_id uuid)
RETURNS SETOF ticket_batches
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM ticket_batches
  WHERE event_id = _event_id
    AND (
      starts_at IS NULL
      OR ends_at IS NULL
      OR (
        now() >= starts_at
        AND now() <= ends_at
      )
    )
  ORDER BY created_at ASC;
END;
$$;
