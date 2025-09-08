import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadedVideo {
  file: File;
  url: string;
  path: string;
  duration?: number; // Duration in seconds with decimal precision
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
      // Generate unique filename - upload directly to root of bucket
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = fileName; // Upload directly to bucket root, no subfolder

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

      // Get video duration
      const duration = await getVideoDuration(file);

      setUploadProgress(100);
      toast.success('Видео успешно загружено!');

      return {
        file,
        url: publicUrl,
        path: data.path,
        duration
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