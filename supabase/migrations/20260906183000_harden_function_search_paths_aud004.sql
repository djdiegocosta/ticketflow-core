-- AUD-004: pin function search_path to prevent mutable search_path resolution.
-- All object references in these functions are schema-qualified where required.

ALTER FUNCTION public.generate_short_code()
  SET search_path = '';

ALTER FUNCTION public.get_hourly_sales_stats(uuid)
  SET search_path = '';

ALTER FUNCTION public.get_new_customers_count(integer)
  SET search_path = '';
