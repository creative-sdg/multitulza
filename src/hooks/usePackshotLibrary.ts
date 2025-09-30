import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface PackshotFile {
  name: string;
  url: string;
  path: string;
  brandId?: string;
  createdAt: string;
}

export const usePackshotLibrary = () => {
  const [packshots, setPackshots] = useState<PackshotFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load all packshots from storage
  const loadPackshots = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('videos')
        .list('packshots', {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      const files: PackshotFile[] = data.map(file => ({
        name: file.name,
        path: `packshots/${file.name}`,
        url: supabase.storage.from('videos').getPublicUrl(`packshots/${file.name}`).data.publicUrl,
        createdAt: file.created_at
      }));

      setPackshots(files);
    } catch (error) {
      console.error('Error loading packshots:', error);
      toast.error('Ошибка загрузки библиотеки packshots');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a new packshot
  const uploadPackshot = async (file: File, brandId?: string): Promise<PackshotFile | null> => {
    setUploadProgress(0);
    setIsLoading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${brandId || 'custom'}_${Date.now()}.${fileExt}`;
      const filePath = `packshots/${fileName}`;

      const { error } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const newPackshot: PackshotFile = {
        name: fileName,
        path: filePath,
        url: publicUrl,
        brandId,
        createdAt: new Date().toISOString()
      };

      setPackshots(prev => [newPackshot, ...prev]);
      setUploadProgress(100);
      toast.success('Packshot загружен!');

      return newPackshot;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки packshot');
      return null;
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // Delete a packshot
  const deletePackshot = async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from('videos')
        .remove([path]);

      if (error) throw error;

      setPackshots(prev => prev.filter(p => p.path !== path));
      toast.success('Packshot удалён');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Ошибка удаления');
    }
  };

  useEffect(() => {
    loadPackshots();
  }, []);

  return {
    packshots,
    isLoading,
    uploadProgress,
    uploadPackshot,
    deletePackshot,
    loadPackshots
  };
};
