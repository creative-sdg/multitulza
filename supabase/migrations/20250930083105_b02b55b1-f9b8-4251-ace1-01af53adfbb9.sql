-- Create storage bucket for video files
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true);

-- Allow anyone to view videos (public bucket)
CREATE POLICY "Public video access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Allow anyone to upload videos
CREATE POLICY "Allow video uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- Allow users to delete their own videos
CREATE POLICY "Allow video deletion"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');