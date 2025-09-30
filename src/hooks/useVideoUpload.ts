import { useState } from 'react';
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
      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);
      console.log('📤 Creating local URL for video:', file.name);

      // Get video duration
      const duration = await getVideoDuration(file);

      setUploadProgress(100);
      toast.success('Видео успешно загружено!');

      return {
        file,
        url: objectUrl,
        path: file.name,
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