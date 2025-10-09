import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface UploadedVideo {
  file: File;
  url: string;
  path: string;
  duration?: number;
}

export const useVideoUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration * 10) / 10; // Round to 1 decimal place
        console.log(`📹 Video duration: ${duration} seconds`);
        resolve(duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const uploadVideo = async (file: File): Promise<UploadedVideo | null> => {
    if (!file) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('📤 Uploading video to storage:', file.name);
      
      // Get video duration first
      const duration = await getVideoDuration(file);
      setUploadProgress(30);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw error;
      }

      setUploadProgress(70);

      // Get signed URL (valid for 1 hour) for external services like Creatomate
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('videos')
        .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

      if (signedUrlError || !signedUrlData) {
        console.error('❌ Failed to create signed URL:', signedUrlError);
        throw new Error('Failed to create signed URL');
      }

      console.log('✅ Video uploaded to storage with signed URL');
      setUploadProgress(100);
      toast.success('Видео загружено в облако!');

      return {
        file,
        url: signedUrlData.signedUrl,
        path: filePath,
        duration
      };

    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error('Ошибка при загрузке видео');
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