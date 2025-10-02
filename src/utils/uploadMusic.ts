import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MusicFile {
  localPath: string;
  storagePath: string;
}

const MUSIC_FILES: MusicFile[] = [
  { localPath: '/music/lucas_v2.wav', storagePath: 'music/lucas_v2.wav' },
  { localPath: '/music/povdate_esp.wav', storagePath: 'music/povdate_esp.wav' },
  { localPath: '/music/nelson_v1.wav', storagePath: 'music/nelson_v1.wav' },
  { localPath: '/music/variations_v1.wav', storagePath: 'music/variations_v1.wav' },
  { localPath: '/music/variations_v2.wav', storagePath: 'music/variations_v2.wav' },
  { localPath: '/music/variations_v3.wav', storagePath: 'music/variations_v3.wav' },
  { localPath: '/music/variations_v4.wav', storagePath: 'music/variations_v4.wav' },
  { localPath: '/music/benjamin.wav', storagePath: 'music/benjamin.wav' },
  { localPath: '/music/asher_v2.wav', storagePath: 'music/asher_v2.wav' },
  { localPath: '/music/felix_v2.wav', storagePath: 'music/felix_v2.wav' },
];

export async function uploadMusicToStorage(): Promise<void> {
  console.log('🎵 Starting music upload to storage...');
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const music of MUSIC_FILES) {
    try {
      // Check if file already exists in storage
      const { data: existingFiles } = await supabase.storage
        .from('videos')
        .list('music', {
          search: music.storagePath.split('/').pop()
        });

      if (existingFiles && existingFiles.length > 0) {
        console.log(`⏭️  Skipping ${music.storagePath} (already exists)`);
        skipCount++;
        continue;
      }

      // Fetch the file from public folder
      const response = await fetch(music.localPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${music.localPath}: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Upload to storage
      const { error } = await supabase.storage
        .from('videos')
        .upload(music.storagePath, blob, {
          contentType: 'audio/wav',
          upsert: false
        });

      if (error) {
        throw error;
      }

      console.log(`✅ Uploaded: ${music.storagePath}`);
      successCount++;
      
    } catch (error) {
      console.error(`❌ Error uploading ${music.storagePath}:`, error);
      errorCount++;
    }
  }

  console.log(`\n📊 Upload complete:`);
  console.log(`   ✅ Uploaded: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (successCount > 0) {
    toast.success(`Загружено ${successCount} музыкальных треков в облако!`);
  }
  if (errorCount > 0) {
    toast.error(`Ошибка загрузки ${errorCount} файлов`);
  }
}

// Get storage URL for a music file
export function getMusicStorageUrl(localPath: string): string {
  const fileName = localPath.replace('/music/', 'music/');
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);
  
  return publicUrl;
}
