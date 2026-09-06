-- AUD-009 / AUD-011
-- Optimize RLS policies by evaluating auth.uid() once per statement
-- and remove SELECT policies that are exact duplicates of existing ALL policies.

DO $$
DECLARE
  p record;
  new_qual text;
  new_check text;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
  LOOP
    new_qual := CASE
      WHEN p.qual IS NULL THEN NULL
      ELSE replace(p.qual, 'auth.uid()', '(select auth.uid())')
    END;

    new_check := CASE
      WHEN p.with_check IS NULL THEN NULL
      ELSE replace(p.with_check, 'auth.uid()', '(select auth.uid())')
    END;

    IF new_qual IS DISTINCT FROM p.qual THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I USING (%s)',
        p.policyname, p.schemaname, p.tablename, new_qual
      );
    END IF;

    IF new_check IS DISTINCT FROM p.with_check THEN
      EXECUTE format(
        'ALTER POLICY %I ON %I.%I WITH CHECK (%s)',
        p.policyname, p.schemaname, p.tablename, new_check
      );
    END IF;
  END LOOP;
END $$;

-- These SELECT policies duplicated the exact row condition already supplied
-- by an ALL policy for the same role/table. Removing them does not change access.
DROP POLICY IF EXISTS "Admin vê limites de checkout dos eventos da propria organizaca" ON public.checkout_rate_limits;
DROP POLICY IF EXISTS "Admins can read organization events" ON public.events;
DROP POLICY IF EXISTS "Admins can read organization batches" ON public.ticket_batches;
DROP POLICY IF EXISTS "Admin manages organization MP config" ON public.mp_config;
