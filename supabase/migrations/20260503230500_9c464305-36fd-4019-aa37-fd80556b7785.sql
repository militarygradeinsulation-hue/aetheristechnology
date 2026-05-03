
CREATE POLICY "training-uploads insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'training-uploads');
CREATE POLICY "training-uploads update" ON storage.objects FOR UPDATE USING (bucket_id = 'training-uploads');
CREATE POLICY "training-uploads delete" ON storage.objects FOR DELETE USING (bucket_id = 'training-uploads');
