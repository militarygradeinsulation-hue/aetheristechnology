INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can update event images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can delete event images"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-images');