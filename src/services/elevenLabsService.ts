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
  private readonly supabaseUrl = 'https://kyasmnsbddufkyhcdroj.supabase.co';
  
  async generateAudio(text: string, voiceId: string): Promise<string> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/elevenlabs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate audio: ${response.statusText}`);
      }

      const data = await response.json();
      return data.audioUrl;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }
}

export const elevenLabsService = new ElevenLabsServiceImpl();