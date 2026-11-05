CREATE POLICY "Public can view completed audits"
ON public.drip_prospects
FOR SELECT
TO anon, authenticated
USING (scraped_data ? 'friction_audit' AND (scraped_data->>'audit_status') = 'done');