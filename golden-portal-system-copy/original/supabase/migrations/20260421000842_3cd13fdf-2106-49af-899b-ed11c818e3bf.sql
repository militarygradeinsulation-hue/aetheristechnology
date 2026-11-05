INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

CREATE POLICY "Content images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-images');

CREATE POLICY "Service role can manage content images"
ON storage.objects FOR ALL
USING (bucket_id = 'content-images' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'content-images' AND auth.role() = 'service_role');