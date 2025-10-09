import { supabase } from "@/integrations/supabase/client";

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', language: 'en' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', language: 'en' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'male', language: 'en' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'female', language: 'en' },
];

export interface ElevenLabsService {
  generateAudio(text: string, voiceId: string): Promise<string>; // returns audio URL
}

export class ElevenLabsServiceImpl implements ElevenLabsService {
  async generateAudio(text: string, voiceId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text, voiceId }
      });

      if (error) {
        throw new Error(`Failed to generate audio: ${error.message}`);
      }

      return data.audioUrl;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsServiceImpl();