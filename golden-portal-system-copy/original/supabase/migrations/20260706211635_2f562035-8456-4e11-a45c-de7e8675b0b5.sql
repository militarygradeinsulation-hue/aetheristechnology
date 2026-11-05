GRANT SELECT ON public.forensic_scans TO anon;
DROP POLICY IF EXISTS "forensic_scans public read" ON public.forensic_scans;
CREATE POLICY "forensic_scans public read"
  ON public.forensic_scans
  FOR SELECT
  TO anon, authenticated
  USING (true);