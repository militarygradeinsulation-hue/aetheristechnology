-- Tighten storage policies: require service_role for write operations on
-- blog-thumbnails, onboarding-assets, team-uploads buckets. Public read remains.

DROP POLICY IF EXISTS "Service role can upload blog thumbnails" ON storage.objects;
CREATE POLICY "Service role can upload blog thumbnails"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'blog-thumbnails' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can write onboarding assets" ON storage.objects;
CREATE POLICY "Service role can write onboarding assets"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'onboarding-assets' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can update onboarding assets" ON storage.objects;
CREATE POLICY "Service role can update onboarding assets"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'onboarding-assets' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'onboarding-assets' AND auth.role() = 'service_role');

DROP POLICY IF EXISTS "team-uploads authenticated insert" ON storage.objects;
CREATE POLICY "team-uploads authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'team-uploads');

-- Defense-in-depth: explicit deny-all policies on sensitive mail tables so
-- accidentally permissive future policies cannot accidentally expose data.
-- (Service role bypasses RLS, so edge functions still work.)
CREATE POLICY "rep_email_messages deny client access"
ON public.rep_email_messages FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "rep_mailboxes deny client access"
ON public.rep_mailboxes FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);