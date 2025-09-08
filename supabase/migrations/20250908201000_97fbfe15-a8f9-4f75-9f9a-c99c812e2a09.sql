-- Create storage bucket for videos (public access for external services like Creatomate)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos', 
  true,
  52428800, -- 50MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/avi', 'video/webm', 'video/x-msvideo']
);

-- Create storage policies for video uploads
CREATE POLICY "Anyone can view videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own videos" 
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos' AND auth.role() = 'authenticated');