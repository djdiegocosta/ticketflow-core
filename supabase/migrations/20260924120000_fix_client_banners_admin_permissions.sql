-- Fix permissions and RLS policy for admin banner management.
-- The client_banners table previously granted only SELECT to authenticated,
-- which made the Vitrine list readable but blocked banner creation/update/deletion.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_banners TO authenticated;

DROP POLICY IF EXISTS "Admins can manage banners" ON public.client_banners;

CREATE POLICY "Admins can manage banners"
ON public.client_banners
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
