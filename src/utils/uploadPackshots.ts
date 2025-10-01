import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PackshotFile {
  localPath: string;
  storagePath: string;
}

const PACKSHOT_FILES: PackshotFile[] = [
  // DateMyAge
  { localPath: '/packshots/DateMyAge_packshot_9x16.mp4', storagePath: 'packshots/DateMyAge_packshot_9x16.mp4' },
  { localPath: '/packshots/DateMyAge_packshot_9x16-2.mp4', storagePath: 'packshots/DateMyAge_packshot_9x16-2.mp4' },
  { localPath: '/packshots/DateMyAge_packshot_1x1.mp4', storagePath: 'packshots/DateMyAge_packshot_1x1.mp4' },
  { localPath: '/packshots/DateMyAge_packshot_1x1-2.mp4', storagePath: 'packshots/DateMyAge_packshot_1x1-2.mp4' },
  { localPath: '/packshots/DateMyAge_packshot_16x9.mp4', storagePath: 'packshots/DateMyAge_packshot_16x9.mp4' },
  { localPath: '/packshots/DateMyAge_packshot_16x9-2.mp4', storagePath: 'packshots/DateMyAge_packshot_16x9-2.mp4' },
  
  // EuroDate
  { localPath: '/packshots/EuroDate_packshot_9x16.mp4', storagePath: 'packshots/EuroDate_packshot_9x16.mp4' },
  { localPath: '/packshots/EuroDate_packshot_1x1.mp4', storagePath: 'packshots/EuroDate_packshot_1x1.mp4' },
  { localPath: '/packshots/EuroDate_packshot_16x9.mp4', storagePath: 'packshots/EuroDate_packshot_16x9.mp4' },
  
  // OurLove
  { localPath: '/packshots/OurLove_packshot_9x16.mp4', storagePath: 'packshots/OurLove_packshot_9x16.mp4' },
  { localPath: '/packshots/OurLove_packshot_1x1.mp4', storagePath: 'packshots/OurLove_packshot_1x1.mp4' },
  { localPath: '/packshots/OurLove_packshot_16x9.mp4', storagePath: 'packshots/OurLove_packshot_16x9.mp4' },
  
  // Dating.Com
  { localPath: '/packshots/dc_packshot_simple_languages_1080x1920.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1080x1920.mp4' },
  { localPath: '/packshots/dc_packshot_simple_languages_1080x1920-2.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1080x1920-2.mp4' },
  { localPath: '/packshots/dc_packshot_simple_languages_1080x1080.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1080x1080.mp4' },
  { localPath: '/packshots/dc_packshot_simple_languages_1080x1080-2.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1080x1080-2.mp4' },
  { localPath: '/packshots/dc_packshot_simple_languages_1920x1080.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1920x1080.mp4' },
  { localPath: '/packshots/dc_packshot_simple_languages_1920x1080-2.mp4', storagePath: 'packshots/dc_packshot_simple_languages_1920x1080-2.mp4' },
];

export async function uploadPackshotsToStorage(): Promise<void> {
  console.log('🚀 Starting packshots upload to storage...');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const packshot of PACKSHOT_FILES) {
    try {
      // Check if file already exists in storage
      const { data: existingFiles } = await supabase.storage
        .from('videos')
        .list('packshots', {
          search: packshot.storagePath.split('/').pop()
        });

      if (existingFiles && existingFiles.length > 0) {
        console.log(`⏭️  Skipping ${packshot.storagePath} (already exists)`);
        skipCount++;
        continue;
      }

      // Fetch the file from public folder
      const response = await fetch(packshot.localPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${packshot.localPath}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Upload to storage
      const { error } = await supabase.storage
        .from('videos')
        .upload(packshot.storagePath, blob, {
          contentType: 'video/mp4',
          upsert: false
        });

      if (error) {
        throw error;
      }

      console.log(`✅ Uploaded: ${packshot.storagePath}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error uploading ${packshot.storagePath}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Upload complete:`);
  console.log(`   ✅ Uploaded: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (successCount > 0) {
    toast.success(`Загружено ${successCount} packshots в облако!`);
  }
  if (errorCount > 0) {
    toast.error(`Ошибка загрузки ${errorCount} файлов`);
  }
}

// Get storage URL for a packshot
export function getPackshotStorageUrl(localPath: string): string {
  const fileName = localPath.replace('/packshots/', 'packshots/');
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
