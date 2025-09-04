import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadedVideo {
  file: File;
  url: string;
  path: string;
}

export const useVideoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadVideo = async (file: File): Promise<UploadedVideo | null> => {
    if (!file) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `videos/${fileName}`;

      console.log('📤 Uploading video to Supabase Storage:', filePath);

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (error) {
        console.error('❌ Upload error:', error);
        toast.error('Ошибка загрузки видео: ' + error.message);
        return null;
      }

      console.log('✅ Video uploaded successfully:', data.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 Public URL generated:', publicUrl);

      setUploadProgress(100);
      toast.success('Видео успешно загружено!');

      return {
        file,
        url: publicUrl,
        path: data.path
      };

    } catch (error) {
      console.error('❌ Unexpected upload error:', error);
      toast.error('Неожиданная ошибка при загрузке видео');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  return {
    uploadVideo,
    isUploading,
    uploadProgress
  };
};