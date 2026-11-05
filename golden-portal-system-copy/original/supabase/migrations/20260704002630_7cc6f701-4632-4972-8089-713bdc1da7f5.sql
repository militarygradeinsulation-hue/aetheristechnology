REVOKE SELECT ON public.forensic_scans FROM anon;
DROP POLICY IF EXISTS "forensic_scans public read by id" ON public.forensic_scans;
DROP POLICY IF EXISTS "forensic_scans admin read" ON public.forensic_scans;
CREATE POLICY "forensic_scans admin read" ON public.forensic_scans FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));