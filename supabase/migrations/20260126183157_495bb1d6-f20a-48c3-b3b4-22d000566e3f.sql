-- Create storage bucket for blog thumbnails
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-thumbnails', 'blog-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to blog thumbnails
CREATE POLICY "Blog thumbnails are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-thumbnails');

-- Allow service role to insert thumbnails
CREATE POLICY "Service role can upload blog thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-thumbnails');