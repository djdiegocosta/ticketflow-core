-- Grant access to client_banners table
GRANT SELECT ON public.client_banners TO authenticated;
GRANT SELECT ON public.client_banners TO anon;

-- Enable RLS (already enabled likely, but just in case)
ALTER TABLE public.client_banners ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage all banners
DROP POLICY IF EXISTS "Admins can manage banners" ON public.client_banners;
CREATE POLICY "Admins can manage banners"
ON public.client_banners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for authenticated users (customers) to read banners from their organization
DROP POLICY IF EXISTS "Customers can read their organization banners" ON public.client_banners;
CREATE POLICY "Customers can read their organization banners"
ON public.client_banners
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.customers WHERE user_id = auth.uid()
  )
  OR
  organization_id IN (
    SELECT organization_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Policy for public access (if needed for checkout/public pages, though Vitrine is usually for customers)
-- For now, limited to authenticated via the above.
