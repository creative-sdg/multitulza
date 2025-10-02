import { supabase } from '@/integrations/supabase/client';

const MUSIC_FILES = [
  'lucas_v2.wav',
  'povdate_esp.wav',
  'nelson_v1.wav',
  'variations_v1.wav',
  'variations_v2.wav',
  'variations_v3.wav',
  'variations_v4.wav',
  'benjamin.wav',
  'asher_v2.wav',
  'felix_v2.wav'
];

export async function uploadMusicToStorage() {
  console.log('🎵 Starting music upload to Supabase Storage...');
  
  for (const fileName of MUSIC_FILES) {
    try {
      // Fetch the music file from public folder
      const response = await fetch(`/music/${fileName}`);
      if (!response.ok) {
        console.error(`❌ Failed to fetch ${fileName}`);
        continue;
      }
      
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: 'audio/wav' });
      
      // Upload to Supabase Storage in videos/music folder
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(`music/${fileName}`, file, {
          upsert: true,
          contentType: 'audio/wav'
        });
      
      if (error) {
        console.error(`❌ Error uploading ${fileName}:`, error);
      } else {
        console.log(`✅ Uploaded ${fileName}`);
      }
    } catch (error) {
      console.error(`❌ Exception uploading ${fileName}:`, error);
    }
  }
  
  console.log('🎵 Music upload completed!');
}

// Get public URL for music file
export function getMusicUrl(fileName: string): string {
  const { data } = supabase.storage
    .from('videos')
    .getPublicUrl(`music/${fileName}`);
  
  return data.publicUrl;
}
