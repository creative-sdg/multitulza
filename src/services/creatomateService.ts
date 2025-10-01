interface CreatomateTemplate {
  id: string;
  name: string;
  size: string;
  dimensions: string;
  mainVideoField: string;
  packshotField: string;
  supportsCustomText?: boolean;
  supportsSubtitles?: boolean;
  textMode?: boolean;
}

interface Brand {
  id: string;
  name: string;
}

interface CreatomateRenderRequest {
  template_id: string;
  modifications: {
    [key: string]: any;
  };
}

interface CreatomateRenderResponse {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  url?: string;
  progress?: number;
  error?: string;
}

export class CreatomateService {
  private apiKey: string;
  private baseUrl = 'https://api.creatomate.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    console.log(`🌐 API Request: ${method} ${this.baseUrl}${endpoint}`);
    if (data) console.log('📤 Request data:', data);
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Creatomate API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 API Response:', result);
    return result;
  }

  async renderVideo(template: CreatomateTemplate, videoUrl: string, packshotUrl?: string, videoDuration?: number, options?: { 
    enableSubtitles?: boolean; 
    customText?: string; 
    chunkedAudio?: any[]; 
    textBlocks?: string[]; 
    subtitleVisibility?: number; 
    audioVolume?: number; 
    customTextEnabled?: boolean;
    selectedTemplate?: any;
    musicUrl?: string;
    brandName?: string; // Add brand name for text replacement
  }): Promise<string> {
    console.log(`🎬 Starting render for template: ${template.name} (${template.id})`);
    console.log(`📹 Video URL: ${videoUrl}`);
    if (packshotUrl) console.log(`🎯 Packshot URL: ${packshotUrl}`);
    if (videoDuration) console.log(`⏱️ Video duration: ${videoDuration}s`);
    if (options?.enableSubtitles) console.log(`🔤 Subtitles enabled`);
    if (options?.customText) console.log(`✏️ Custom text: ${options.customText.substring(0, 50)}...`);
    if (options?.chunkedAudio) console.log(`🎵 Chunked audio with ${options.chunkedAudio.length} chunks`);
    
    // Start rendering with the URLs
    const modifications: any = {};
    
    // Add packshot only if provided and template supports it
    if (packshotUrl && template.packshotField) {
      // Packshot URL should already be a full URL from storage
      modifications[template.packshotField] = packshotUrl;
      console.log(`🎯 Packshot URL: ${packshotUrl}`);
    }
    
    // Handle chunked audio scenario and text emoji templates
    if (options?.chunkedAudio && (
      template.size === 'chunked-v2' || 
      template.size === 'chunked-square' || 
      template.size === 'chunked-horizontal' ||
      template.size === 'text-emoji' ||
      template.size === 'text-emoji-v2'
    )) {
      console.log('🎵 Processing chunked audio/text scenario...');
      
      let totalAudioDuration = 0;
      
      // Set up each chunk with its video and audio
      options.chunkedAudio.forEach((chunk, index) => {
        const chunkIndex = index + 1;
        
        // Set video for each chunk
        if (chunk.videoFile?.url) {
          modifications[`Main_Video_${chunkIndex}`] = chunk.videoFile.url;
          console.log(`📹 Set Main_Video_${chunkIndex}: ${chunk.videoFile.url}`);
          
          // For square and horizontal templates, also set the _back video
          if (template.size === 'chunked-square' || template.size === 'chunked-horizontal') {
            modifications[`Main_Video_${chunkIndex}_back`] = chunk.videoFile.url;
            console.log(`📹 Set Main_Video_${chunkIndex}_back: ${chunk.videoFile.url}`);
            modifications[`Main_Video_${chunkIndex}_back.duration`] = 'media';
          }
          
          // Set video duration based on effective audio duration
          if (chunk.effectiveDuration) {
            modifications[`Main_Video_${chunkIndex}.duration`] = chunk.effectiveDuration;
            console.log(`⏱️ Set Main_Video_${chunkIndex} duration: ${chunk.effectiveDuration}s`);
          } else {
            modifications[`Main_Video_${chunkIndex}.duration`] = 'media';
          }
        }
        
        // Set audio for each chunk with start time
        if (chunk.audioUrl) {
          modifications[`Audio_${chunkIndex}`] = chunk.audioUrl;
          console.log(`🔊 Set Audio_${chunkIndex}: ${chunk.audioUrl}`);
          
          // Set audio start time if available
          if (chunk.startTime !== undefined) {
            modifications[`Audio_${chunkIndex}.time`] = chunk.startTime;
            console.log(`⏰ Set Audio_${chunkIndex} start time: ${chunk.startTime}s`);
          }
        }
        
        // Add to total audio duration
        if (chunk.effectiveDuration) {
          totalAudioDuration += chunk.effectiveDuration;
        }
        
        // Set subtitles source for each chunk if subtitles are enabled
        if (options.enableSubtitles) {
          // Set subtitle source for each chunk
          modifications[`element_subtitles_${chunkIndex}.transcript_source`] = `Audio_${chunkIndex}`;
          
          // Set subtitle start time if available (same as audio)
          if (chunk.startTime !== undefined) {
            modifications[`element_subtitles_${chunkIndex}.time`] = chunk.startTime;
            console.log(`⏰ Set element_subtitles_${chunkIndex} start time: ${chunk.startTime}s`);
          }
          
          console.log(`🔤 Set subtitles for chunk ${chunkIndex} with source Audio_${chunkIndex}`);
        }
      });
      
      // Set subtitles for all 10 chunks if subtitles are enabled (only transcript_source)
      if (options.enableSubtitles) {
        for (let i = 1; i <= 10; i++) {
          modifications[`element_subtitles_${i}.transcript_source`] = `Audio_${i}`;
        }
        console.log(`🔤 Set subtitles for all 10 chunks`);
      }
      
      // Calculate packshot timing and total duration
      const packshotStartTime = totalAudioDuration;
      
      // Set packshot properties  
      if (packshotUrl && template.packshotField) {
        modifications['Packshot.time'] = packshotStartTime;
        modifications['Packshot.duration'] = 'media'; // Use actual media duration
        console.log(`🎯 Set Packshot start time: ${packshotStartTime}s with media duration`);
      }
      
      // Handle text-emoji specific configurations
      if (template.size === 'text-emoji') {
        // For text-emoji template, set 2-second durations for all video chunks
        for (let i = 1; i <= 10; i++) {
          modifications[`Main_Video_${i}.duration`] = 2;
        }
        console.log('📝 Set all Main_Video durations to 2 seconds for text-emoji template');
        
        // Set text blocks if provided in options
        if (options.textBlocks) {
          // Apply brand replacement to text blocks if brandName is provided
          const processedTextBlocks = options.brandName 
            ? options.textBlocks.map(text => this.applyBrandReplacement(text, options.brandName!))
            : options.textBlocks;
          
          processedTextBlocks.forEach((text, index) => {
            if (index < 10) {
              modifications[`Text-${index + 1}.text`] = text;
              console.log(`📝 Set Text-${index + 1}: ${text}`);
            }
          });
        }
        
        // Calculate packshot timing - right after all video chunks
        const totalVideoDuration = options.chunkedAudio ? options.chunkedAudio.length * 2 : 0;
        modifications['Packshot.time'] = totalVideoDuration;
        modifications['Packshot.duration'] = 'media';
        modifications['duration'] = null;
        console.log(`🎯 Set Packshot start time: ${totalVideoDuration}s for text-emoji template`);
        
      } else if (template.size === 'text-emoji-v2') {
        // Set audio volume and subtitle visibility based on options
        const audioVol = options.audioVolume !== undefined ? `${options.audioVolume}%` : '100%';
        const subtitleOp = options.subtitleVisibility !== undefined ? `${options.subtitleVisibility}%` : '100%';
        
        // Set video duration - always use effectiveDuration or 2 seconds minimum
        for (let i = 1; i <= 10; i++) {
          const chunk = options.chunkedAudio?.[i - 1];
          if (chunk?.effectiveDuration) {
            modifications[`Main_Video_${i}.duration`] = chunk.effectiveDuration;
            console.log(`⏱️ Set Main_Video_${i} duration to ${chunk.effectiveDuration}s (from chunk effectiveDuration)`);
          } else {
            // Default to 2 seconds if no effectiveDuration
            modifications[`Main_Video_${i}.duration`] = 2;
            console.log(`⏱️ Set Main_Video_${i} duration to 2s (default)`);
          }
        }
        
        // Set audio, subtitles and text with proper timing
        options.chunkedAudio?.forEach((chunk, index) => {
          const i = index + 1;
          
          // Set audio properties
          modifications[`Audio_${i}.volume`] = audioVol;
          if (chunk.startTime !== undefined) {
            modifications[`Audio_${i}.time`] = chunk.startTime;
            console.log(`⏰ Set Audio_${i} start time: ${chunk.startTime}s`);
          }
          
          // Set subtitle properties
          modifications[`element_subtitles_${i}.opacity`] = subtitleOp;
          if (chunk.startTime !== undefined) {
            modifications[`element_subtitles_${i}.time`] = chunk.startTime;
            console.log(`⏰ Set element_subtitles_${i} start time: ${chunk.startTime}s`);
          }
          modifications[`element_subtitles_${i}.transcript_source`] = `Audio_${i}`;
        });
        
        console.log(`🔊 Set audio volume: ${audioVol}, subtitle opacity: ${subtitleOp}`);
        
        // Set text blocks if provided
        if (options.textBlocks) {
          // Apply brand replacement to text blocks if brandName is provided
          const processedTextBlocks = options.brandName 
            ? options.textBlocks.map(text => this.applyBrandReplacement(text, options.brandName!))
            : options.textBlocks;
          
          // Calculate text opacity based on subtitle visibility (inverse relationship)
          const textOpacity = options.subtitleVisibility !== undefined 
            ? `${100 - options.subtitleVisibility}%` 
            : '100%';
          
          processedTextBlocks.forEach((text, index) => {
            if (index < 10) {
              modifications[`Text-${index + 1}.text`] = text;
              modifications[`Text-${index + 1}.opacity`] = textOpacity;
              
              // Set text timing based on corresponding audio chunk
              const chunk = options.chunkedAudio?.[index];
              if (chunk?.startTime !== undefined) {
                modifications[`Text-${index + 1}.time`] = chunk.startTime;
                console.log(`⏰ Set Text-${index + 1} start time: ${chunk.startTime}s`);
              }
              
              // Set text duration based on audio mode
              if (audioVol === '0%') {
                // No audio mode - use 2 seconds per text block
                modifications[`Text-${index + 1}.duration`] = 2;
              } else if (chunk?.effectiveDuration) {
                // Audio mode - use chunk duration
                modifications[`Text-${index + 1}.duration`] = chunk.effectiveDuration;
              }
              
              console.log(`📝 Set Text-${index + 1}: ${text} (duration: ${audioVol === '0%' ? '2s' : chunk?.effectiveDuration || 'auto'}s, opacity: ${textOpacity})`);
            }
          });
        }
        
        // Calculate duration based on audio vs text mode
        let calculatedDuration = 0;
        const estimatedPackshotDuration = 3;
        
        if (audioVol === '0%') {
          // Text mode - use 2 seconds per text block
          const textBlockCount = options.chunkedAudio ? options.chunkedAudio.length : 0;
          calculatedDuration = textBlockCount * 2 + estimatedPackshotDuration;
          console.log(`📝 Text mode: ${textBlockCount} blocks × 2s + ${estimatedPackshotDuration}s packshot = ${calculatedDuration}s`);
        } else {
          // Audio mode - use audio duration
          calculatedDuration = totalAudioDuration + estimatedPackshotDuration;
          console.log(`🔊 Audio mode: ${totalAudioDuration}s audio + ${estimatedPackshotDuration}s packshot = ${calculatedDuration}s`);
        }
        
        modifications['duration'] = calculatedDuration;
        modifications['Packshot.time'] = calculatedDuration - estimatedPackshotDuration;
        modifications['Packshot.duration'] = 'media';
        
        // Add music if provided
        if (options.musicUrl) {
          modifications['Song'] = options.musicUrl;
          modifications['Song.duration'] = 'media';
          console.log(`🎵 Set music: ${options.musicUrl}`);
        }
        
        console.log(`🎯 Set total video duration: ${calculatedDuration}s, packshot starts at: ${calculatedDuration - estimatedPackshotDuration}s`);
      } else {
        // Standard chunked audio processing
        // Set total video duration to be exactly audio duration + packshot duration (3s default)
        // This prevents extra empty time at the end
        const estimatedPackshotDuration = 3; // Standard packshot duration
        modifications['duration'] = totalAudioDuration + estimatedPackshotDuration;
        console.log(`🎬 Set total video duration: ${totalAudioDuration + estimatedPackshotDuration}s (audio: ${totalAudioDuration}s + packshot: ~${estimatedPackshotDuration}s)`);
      }
      
    } else {
      // Add main video field(s) for regular scenarios
      if (template.mainVideoField.includes(',')) {
        // Multiple main video fields (like for square template)
        template.mainVideoField.split(',').forEach(field => {
          modifications[field.trim()] = videoUrl;
        });
      } else {
        modifications[template.mainVideoField] = videoUrl;
      }
    }

    // Handle subtitles for non-chunked templates
    if (template.supportsSubtitles && !options?.chunkedAudio) {
      if (options?.enableSubtitles) {
        // Enable subtitles
        modifications['element_subtitles.visible'] = true;
        // Use correct video source for subtitles based on template
        const subtitleSource = template.size === 'vertical' ? 'Main_Video' : 'Main_Video_front';
        modifications['element_subtitles.transcript_source'] = subtitleSource;
        console.log(`🔤 Configured subtitles for template using source: ${subtitleSource}`);
      } else {
        // Hide subtitles
        modifications['element_subtitles.visible'] = false;
      }
    }

    // Add emoji style for text emoji templates
    if (template.size === 'text-emoji' || template.size === 'text-emoji-v2') {
      modifications['emoji_style'] = 'apple';
      console.log('🍎 Set emoji style to apple');
    }

    const renderRequest: CreatomateRenderRequest = {
      template_id: template.id,
      modifications,
    };

    console.log(`🚀 Starting render with modifications:`, modifications);
    const renderResponse = await this.makeRequest('/renders', 'POST', renderRequest);
    console.log(`✅ Render started with ID: ${renderResponse.id}`);
    return renderResponse.id;
  }

  async getRenderStatus(renderId: string): Promise<CreatomateRenderResponse> {
    return this.makeRequest(`/renders/${renderId}`);
  }

  async getTemplate(templateId: string): Promise<any> {
    console.log(`📋 Getting template info: ${templateId}`);
    return this.makeRequest(`/templates/${templateId}`);
  }

  async pollRenderStatus(renderId: string, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      let pollInterval = 6000; // Start with 6 seconds
      let retryCount = 0;
      const maxRetries = 5;

      const poll = async () => {
        try {
          const status = await this.getRenderStatus(renderId);
          
          if (status.progress && onProgress) {
            onProgress(status.progress);
          }

          if (status.status === 'succeeded' && status.url) {
            resolve(status.url);
            return;
          } else if (status.status === 'failed') {
            reject(new Error(status.error || 'Rendering failed'));
            return;
          }
          
          // Reset retry count on successful request
          retryCount = 0;
          pollInterval = Math.max(6000, pollInterval * 0.9); // Gradually reduce interval but keep minimum

          // Continue polling if status is 'pending', 'processing', or 'transcribing'
          setTimeout(poll, pollInterval + Math.random() * 2000); // Add jitter
        } catch (error: any) {
          console.error(`❌ Poll error for render ${renderId}:`, error);
          
          // Handle rate limiting and network errors with exponential backoff
          if (error.message?.includes('429') || error.message?.includes('Too Many Requests') || error.message?.includes('Failed to fetch')) {
            retryCount++;
            if (retryCount <= maxRetries) {
              const backoffDelay = Math.min(30000, pollInterval * Math.pow(2, retryCount)) + Math.random() * 5000;
              console.log(`⏳ Rate limited, retrying in ${Math.round(backoffDelay/1000)}s (attempt ${retryCount}/${maxRetries})`);
              setTimeout(poll, backoffDelay);
              return;
            }
          }
          
          reject(error);
        }
      };

      // Start polling with initial jitter
      setTimeout(poll, Math.random() * 3000);
    });
  }

  private splitTextIntoBlocks(text: string, maxLength: number): string {
    const words = text.split(' ');
    const blocks: string[] = [];
    let currentBlock = '';

    for (const word of words) {
      const testBlock = currentBlock === '' ? word : `${currentBlock} ${word}`;
      
      if (testBlock.length <= maxLength) {
        currentBlock = testBlock;
      } else {
        if (currentBlock !== '') {
          blocks.push(currentBlock);
        }
        currentBlock = word;
      }
    }

    if (currentBlock !== '') {
      blocks.push(currentBlock);
    }

    // Return as a single string with line breaks
    return blocks.length > 0 ? blocks.join('\n') : text;
  }

  // Apply brand replacement to text
  private applyBrandReplacement(text: string, brandName: string): string {
    let processedText = text;
    
    // Common brand patterns to replace
    const brandPatterns = [
      'DateMyAge',
      'Date My Age',
      'OurLove',
      'Our Love',
      'EuroDate',
      'Euro Date',
      'DatingClub',
      'Dating Club',
      'Dating.Com',
      'Dating.com',
    ];
    
    brandPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      processedText = processedText.replace(regex, brandName);
    });
    
    return processedText;
  }
}

import { getPackshotStorageUrl } from '@/utils/uploadPackshots';

// Helper function to get packshot URL (either from storage or fallback to local)
function getPackshotUrl(path: string): string {
  return getPackshotStorageUrl(path);
}

//Available brands with their packshot URLs
export const AVAILABLE_BRANDS = [
  { 
    id: 'datemyage', 
    name: 'DateMyAge',
    packshots: {
      vertical: getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      square: getPackshotUrl('/packshots/DateMyAge_packshot_1x1.mp4'),
      horizontal: getPackshotUrl('/packshots/DateMyAge_packshot_16x9.mp4'),
      test: getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      chunked: getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      'chunked-v2': getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      'chunked-square': getPackshotUrl('/packshots/DateMyAge_packshot_1x1.mp4'),
      'chunked-horizontal': getPackshotUrl('/packshots/DateMyAge_packshot_16x9.mp4'),
      'text-emoji': getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      'text-emoji-v2': getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4')
    }
  },
  { 
    id: 'dating', 
    name: 'Dating.Com',
    packshots: {
      vertical: getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      square: getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1080.mp4'),
      horizontal: getPackshotUrl('/packshots/dc_packshot_simple_languages_1920x1080.mp4'),
      test: getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      chunked: getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      'chunked-v2': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      'chunked-square': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1080.mp4'),
      'chunked-horizontal': getPackshotUrl('/packshots/dc_packshot_simple_languages_1920x1080.mp4'),
      'text-emoji': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      'text-emoji-v2': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4')
    }
  },
  { 
    id: 'eurodate', 
    name: 'EuroDate',
    packshots: {
      vertical: getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      square: getPackshotUrl('/packshots/EuroDate_packshot_1x1.mp4'),
      horizontal: getPackshotUrl('/packshots/EuroDate_packshot_16x9.mp4'),
      test: getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      chunked: getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      'chunked-v2': getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      'chunked-square': getPackshotUrl('/packshots/EuroDate_packshot_1x1.mp4'),
      'chunked-horizontal': getPackshotUrl('/packshots/EuroDate_packshot_16x9.mp4'),
      'text-emoji': getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      'text-emoji-v2': getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4')
    }
  },
  { 
    id: 'ourlove', 
    name: 'OurLove',
    packshots: {
      vertical: getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      square: getPackshotUrl('/packshots/OurLove_packshot_1x1.mp4'),
      horizontal: getPackshotUrl('/packshots/OurLove_packshot_16x9.mp4'),
      test: getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      chunked: getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      'chunked-v2': getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      'chunked-square': getPackshotUrl('/packshots/OurLove_packshot_1x1.mp4'),
      'chunked-horizontal': getPackshotUrl('/packshots/OurLove_packshot_16x9.mp4'),
      'text-emoji': getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      'text-emoji-v2': getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4')
    }
  }
];

// Available music tracks
export const AVAILABLE_MUSIC = [
  {
    id: 'lucas_v2',
    name: 'Lucas V2',
    url: '/music/lucas_v2.wav'
  },
  {
    id: 'povdate_esp',
    name: 'POV Date ESP',
    url: '/music/povdate_esp.wav'
  },
  {
    id: 'nelson_v1',
    name: 'Nelson V1',
    url: '/music/nelson_v1.wav'
  },
  {
    id: 'variations_v1',
    name: 'Variations V1',
    url: '/music/variations_v1.wav'
  },
  {
    id: 'variations_v2',
    name: 'Variations V2',
    url: '/music/variations_v2.wav'
  },
  {
    id: 'variations_v3',
    name: 'Variations V3',
    url: '/music/variations_v3.wav'
  },
  {
    id: 'variations_v4',
    name: 'Variations V4',
    url: '/music/variations_v4.wav'
  },
  {
    id: 'benjamin',
    name: 'Benjamin',
    url: '/music/benjamin.wav'
  },
  {
    id: 'asher_v2',
    name: 'Asher V2',
    url: '/music/asher_v2.wav'
  },
  {
    id: 'felix_v2',
    name: 'Felix V2',
    url: '/music/felix_v2.wav'
  }
];

// Template configurations with real Creatomate template IDs
export const CREATOMATE_TEMPLATES: CreatomateTemplate[] = [
  {
    id: '41a34610-feae-4e0d-9725-b8157f7de781',
    name: '9:16 Вертикальное',
    size: 'vertical',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: 'c9aa2c57-d883-4a1e-85dd-020f4e911a70',
    name: '16:9 Горизонтальное',
    size: 'horizontal',
    dimensions: '1920x1080',
    mainVideoField: 'Main_Video_front, Main_Video_back',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: '41e18070-2198-43f2-9503-807fbbd5f749',
    name: '1:1 Квадратное',
    size: 'square',
    dimensions: '1080x1080',
    mainVideoField: 'Main_Video_front, Main_Video_back',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: 'f355b779-a825-473e-bba3-434e404c7030',
    name: '9x16',
    size: 'chunked-v2',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: 'd858c331-52b5-4916-a2f5-f7e1ae4d7493',
    name: '1x1',
    size: 'chunked-square',
    dimensions: '1080x1080',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: '105d7ae4-294c-496a-b7af-9b1c35af6dbe',
    name: '16x9',
    size: 'chunked-horizontal',
    dimensions: '1920x1080',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: 'bb27c72e-a8a7-4471-b412-d5cfd8a53381',
    name: '9x16 Text Emoji',
    size: 'text-emoji',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: false,
    textMode: true
  },
  {
    id: '4a4c47f1-555c-414f-b45a-1905be6b591d',
    name: '9x16 Text Emoji V2',
    size: 'text-emoji-v2',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: true,
    textMode: true
  }
];

// All templates now support dynamic subtitles via opacity control