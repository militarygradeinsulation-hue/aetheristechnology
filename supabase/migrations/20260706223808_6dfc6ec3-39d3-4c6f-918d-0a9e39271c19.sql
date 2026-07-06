DROP POLICY IF EXISTS "forensic_scans public read" ON public.forensic_scans;
REVOKE SELECT ON public.forensic_scans FROM anon;