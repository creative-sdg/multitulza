export interface CharacterProfile {
  name: string;
  personality: string;
  backstory: string;
  livingPlace: string;
  style: string;
}

export interface GeneratedMedia {
  prompt: string;
  url: string;
  type: 'image' | 'video';
  model?: string;
  width?: number;
  height?: number;
  size?: number;
  scene?: string;
  seed?: number;
  isFavorite?: boolean;
  resolution?: VideoResolution;
  duration?: VideoDuration;
}

export interface ImagePrompt {
  scene: string;
  prompt: string;
  variations?: string[];
  generatedImageUrl?: string;
  generatedMedia?: GeneratedMedia[];
  generationError?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageId: string;
  companionImageId?: string;
  characterProfile: CharacterProfile;
  imagePrompts: ImagePrompt[];
  generationMode?: GenerationMode;
  generationStyle?: GenerationStyle;
}

export type GenerationMode = 'normal' | 'selfie' | 'romantic' | 'date' | 'couple';
export type GenerationStyle = 'cinematic' | 'ugc';

export type ActivityCategory =
  | 'Sports activities'
  | 'Artistic activities'
  | 'Lifestyle & relaxation'
  | 'Daily life'
  | 'Original experiences'
  | 'Romantic Activities'
  | 'Date Activities'
  | 'Couple Activities';

export type ActivityLists = Record<ActivityCategory, string[]>;
export type ActivityCounts = Record<ActivityCategory, number>;

export type ImageGenerationModel = 'nano-banana' | 'seedream';
export type VideoGenerationModel = 'seedance-pro' | 'seedance-lite' | 'hailuo-2-standard' | 'hailuo-2-pro';

export type VideoResolution = '480p' | '512p' | '720p' | '768p' | '1080p';
export type VideoDuration = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12';

export interface VideoGenerationParams {
  prompt: string;
  resolution: VideoResolution;
  duration: VideoDuration;
  model: VideoGenerationModel;
}
