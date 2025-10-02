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
    
    // Add packshot only if provided and template supports it (not for 9x16-clean)
    if (packshotUrl && template.packshotField && template.size !== '9x16-clean') {
      // Packshot URL should already be a full URL from storage
      modifications[template.packshotField] = packshotUrl;
      console.log(`🎯 Packshot URL: ${packshotUrl}`);
    }
    
    // Handle chunked audio scenario and text emoji templates
    if (options?.chunkedAudio && (
      template.size === '9x16' || 
      template.size === '16x9' || 
      template.size === '1x1' ||
      template.size === '9x16-clean'
    )) {
      console.log('🎵 Processing chunked audio/text scenario...');
      
      let totalAudioDuration = 0;
      
      // Set up each chunk with its video and audio
      options.chunkedAudio.forEach((chunk, index) => {
        const chunkIndex = index + 1;
        
        // Set video for each chunk
        if (chunk.videoFile?.url) {
          // Set front video
          if (template.size === '16x9' || template.size === '1x1') {
            modifications[`Main_Video_${chunkIndex}_front`] = chunk.videoFile.url;
            modifications[`Main_Video_${chunkIndex}_back`] = chunk.videoFile.url;
            console.log(`📹 Set Main_Video_${chunkIndex}_front and _back: ${chunk.videoFile.url}`);
            
            // Set start time for front and back (must match)
            if (chunk.startTime !== undefined) {
              modifications[`Main_Video_${chunkIndex}_front.time`] = chunk.startTime;
              modifications[`Main_Video_${chunkIndex}_back.time`] = chunk.startTime;
              console.log(`⏰ Set Main_Video_${chunkIndex}_front and _back start time: ${chunk.startTime}s`);
            }
            
            // Set durations for front and back
            if (chunk.effectiveDuration) {
              modifications[`Main_Video_${chunkIndex}_front.duration`] = chunk.effectiveDuration;
              modifications[`Main_Video_${chunkIndex}_back.duration`] = chunk.effectiveDuration;
              console.log(`⏱️ Set Main_Video_${chunkIndex}_front and _back duration: ${chunk.effectiveDuration}s`);
            } else {
              modifications[`Main_Video_${chunkIndex}_front.duration`] = 2;
              modifications[`Main_Video_${chunkIndex}_back.duration`] = 2;
              console.log(`⏱️ Set Main_Video_${chunkIndex}_front and _back duration: 2s (default)`);
            }
          } else {
            // For 9x16 and 9x16-clean, use normal Main_Video fields
            modifications[`Main_Video_${chunkIndex}`] = chunk.videoFile.url;
            console.log(`📹 Set Main_Video_${chunkIndex}: ${chunk.videoFile.url}`);
            
            // Set start time for video
            if (chunk.startTime !== undefined) {
              modifications[`Main_Video_${chunkIndex}.time`] = chunk.startTime;
              console.log(`⏰ Set Main_Video_${chunkIndex} start time: ${chunk.startTime}s`);
            }
            
            // Set video duration based on effective audio duration
            if (chunk.effectiveDuration) {
              modifications[`Main_Video_${chunkIndex}.duration`] = chunk.effectiveDuration;
              console.log(`⏱️ Set Main_Video_${chunkIndex} duration: ${chunk.effectiveDuration}s`);
            } else {
              modifications[`Main_Video_${chunkIndex}.duration`] = 2;
              console.log(`⏱️ Set Main_Video_${chunkIndex} duration: 2s (default)`);
            }
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
      
      // Set packshot properties only if packshot is provided AND template supports it
      // Don't set packshot for 9x16-clean or if packshotUrl is empty
      if (packshotUrl && template.packshotField && template.size !== '9x16-clean') {
        modifications['Packshot.time'] = packshotStartTime;
        modifications['Packshot.duration'] = 'media'; // Use actual media duration
        console.log(`🎯 Set Packshot start time: ${packshotStartTime}s with media duration`);
      }
      
      // For 9x16-clean, set duration without packshot
      if (template.size === '9x16-clean') {
        console.log('🎬 9x16-clean template - videos only, no audio/subtitles/packshot');
        
        // Set duration based on total audio duration (without packshot)
        modifications['duration'] = totalAudioDuration;
        console.log(`🎯 Set 9x16-clean total duration: ${totalAudioDuration}s (no packshot)`);
      } else {
        // Set audio volume and subtitle visibility based on options
        const audioVol = options.audioVolume !== undefined ? `${options.audioVolume}%` : '100%';
        const subtitleOp = options.subtitleVisibility !== undefined ? `${options.subtitleVisibility}%` : '100%';
        
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
            
            // Ensure subtitles end before packshot starts
            if (chunk.effectiveDuration && packshotUrl) {
              const maxDuration = totalAudioDuration - chunk.startTime;
              const subtitleDuration = Math.min(chunk.effectiveDuration, maxDuration);
              modifications[`element_subtitles_${i}.duration`] = subtitleDuration;
              console.log(`⏰ Set element_subtitles_${i} start: ${chunk.startTime}s, duration: ${subtitleDuration}s (capped before packshot)`);
            } else {
              console.log(`⏰ Set element_subtitles_${i} start time: ${chunk.startTime}s`);
            }
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
                
                // Set text duration based on audio mode
                if (audioVol === '0%') {
                  // No audio mode - use 2 seconds per text block
                  modifications[`Text-${index + 1}.duration`] = 2;
                } else if (chunk?.effectiveDuration) {
                  // Audio mode - ensure text ends before packshot starts
                  if (packshotUrl) {
                    const maxDuration = totalAudioDuration - chunk.startTime;
                    const textDuration = Math.min(chunk.effectiveDuration, maxDuration);
                    modifications[`Text-${index + 1}.duration`] = textDuration;
                    console.log(`⏰ Set Text-${index + 1} start: ${chunk.startTime}s, duration: ${textDuration}s (capped before packshot)`);
                  } else {
                    // No packshot - use full duration
                    modifications[`Text-${index + 1}.duration`] = chunk.effectiveDuration;
                    console.log(`⏰ Set Text-${index + 1} start: ${chunk.startTime}s, duration: ${chunk.effectiveDuration}s`);
                  }
                }
                
                console.log(`📝 Set Text-${index + 1}: ${text} (opacity: ${textOpacity})`);
              }
            }
          });
        }
        
        // Calculate duration based on audio vs text mode and template
        let calculatedDuration = 0;
        const estimatedPackshotDuration = 3;
        
        // For clean template (no packshot), duration = only audio
        const isCleanTemplate = !template.packshotField || template.packshotField === '';
        
        if (isCleanTemplate) {
          calculatedDuration = totalAudioDuration;
          console.log(`🎬 Clean version: duration = ${totalAudioDuration}s (no packshot)`);
        } else if (audioVol === '0%') {
          // Text mode - use 2 seconds per text block + packshot
          const textBlockCount = options.chunkedAudio ? options.chunkedAudio.length : 0;
          calculatedDuration = textBlockCount * 2 + estimatedPackshotDuration;
          console.log(`📝 Text mode: ${textBlockCount} blocks × 2s + ${estimatedPackshotDuration}s packshot = ${calculatedDuration}s`);
        } else {
          // Audio mode - use audio duration + packshot
          calculatedDuration = totalAudioDuration + estimatedPackshotDuration;
          console.log(`🔊 Audio mode: ${totalAudioDuration}s audio + ${estimatedPackshotDuration}s packshot = ${calculatedDuration}s`);
        }
        
        modifications['duration'] = calculatedDuration;
        
        // Only set packshot timing if packshot is provided and template supports it
        if (packshotUrl && template.packshotField) {
          modifications['Packshot.time'] = totalAudioDuration; // Packshot starts right after audio
          modifications['Packshot.duration'] = 'media';
          console.log(`🎯 Set Packshot timing: starts at ${totalAudioDuration}s`);
        }
        
        // Add music if provided (not for clean template)
        if (options.musicUrl && template.packshotField) {
          modifications['Song'] = options.musicUrl;
          modifications['Song.duration'] = 'media';
          modifications['Song.provider'] = null;
          console.log(`🎵 Set music: ${options.musicUrl} with media duration`);
        }
        
        // Set emoji style to Apple (iPhone emojis) for all templates
        modifications['emoji_style'] = 'apple';
        console.log(`😊 Set emoji style: Apple (iPhone)`);
        
        console.log(`🎯 Set total video duration: ${calculatedDuration}s, packshot starts at: ${totalAudioDuration}s`);
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
      '9x16': getPackshotUrl('/packshots/DateMyAge_packshot_9x16.mp4'),
      '16x9': getPackshotUrl('/packshots/DateMyAge_packshot_16x9.mp4'),
      '1x1': getPackshotUrl('/packshots/DateMyAge_packshot_1x1.mp4'),
      '9x16-clean': '',
    }
  },
  { 
    id: 'dating', 
    name: 'Dating.Com',
    packshots: {
      '9x16': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1920.mp4'),
      '16x9': getPackshotUrl('/packshots/dc_packshot_simple_languages_1920x1080.mp4'),
      '1x1': getPackshotUrl('/packshots/dc_packshot_simple_languages_1080x1080.mp4'),
      '9x16-clean': '',
    }
  },
  { 
    id: 'eurodate', 
    name: 'EuroDate',
    packshots: {
      '9x16': getPackshotUrl('/packshots/EuroDate_packshot_9x16.mp4'),
      '16x9': getPackshotUrl('/packshots/EuroDate_packshot_16x9.mp4'),
      '1x1': getPackshotUrl('/packshots/EuroDate_packshot_1x1.mp4'),
      '9x16-clean': '',
    }
  },
  { 
    id: 'ourlove', 
    name: 'OurLove',
    packshots: {
      '9x16': getPackshotUrl('/packshots/OurLove_packshot_9x16.mp4'),
      '16x9': getPackshotUrl('/packshots/OurLove_packshot_16x9.mp4'),
      '1x1': getPackshotUrl('/packshots/OurLove_packshot_1x1.mp4'),
      '9x16-clean': '',
    }
  }
];

// Available music tracks - using cloud storage URLs
const CLOUD_URL = 'https://xvxwcqormajrczdmiuul.supabase.co/storage/v1/object/public/videos/music';

export const AVAILABLE_MUSIC = [
  {
    id: 'lucas_v2',
    name: 'Lucas V2',
    url: `${CLOUD_URL}/lucas_v2.mp3`
  },
  {
    id: 'povdate_esp',
    name: 'POV Date ESP',
    url: `${CLOUD_URL}/povdate_esp.mp3`
  },
  {
    id: 'nelson_v1',
    name: 'Nelson V1',
    url: `${CLOUD_URL}/nelson_v1.mp3`
  },
  {
    id: 'variations_v1',
    name: 'Variations V1',
    url: `${CLOUD_URL}/variations_v1.mp3`
  },
  {
    id: 'variations_v2',
    name: 'Variations V2',
    url: `${CLOUD_URL}/variations_v2.mp3`
  },
  {
    id: 'variations_v3',
    name: 'Variations V3',
    url: `${CLOUD_URL}/variations_v3.mp3`
  },
  {
    id: 'variations_v4',
    name: 'Variations V4',
    url: `${CLOUD_URL}/variations_v4.mp3`
  },
  {
    id: 'benjamin',
    name: 'Benjamin',
    url: `${CLOUD_URL}/benjamin.mp3`
  },
  {
    id: 'asher_v2',
    name: 'Asher V2',
    url: `${CLOUD_URL}/asher_v2.mp3`
  },
  {
    id: 'felix_v2',
    name: 'Felix V2',
    url: `${CLOUD_URL}/felix_v2.mp3`
  }
];

// Template configurations with real Creatomate template IDs
export const CREATOMATE_TEMPLATES: CreatomateTemplate[] = [
  {
    id: '4a4c47f1-555c-414f-b45a-1905be6b591d',
    name: '9x16',
    size: '9x16',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: '0dc9573f-22e8-42c0-bac9-b85e7dd349b9',
    name: '16x9',
    size: '16x9',
    dimensions: '1920x1080',
    mainVideoField: 'Main_Video_1_front,Main_Video_2_front,Main_Video_3_front,Main_Video_4_front,Main_Video_5_front,Main_Video_6_front,Main_Video_7_front,Main_Video_8_front,Main_Video_9_front,Main_Video_10_front',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: '19105fe5-452a-4740-a513-73bbbaedec05',
    name: '1x1',
    size: '1x1',
    dimensions: '1080x1080',
    mainVideoField: 'Main_Video_1_front,Main_Video_2_front,Main_Video_3_front,Main_Video_4_front,Main_Video_5_front,Main_Video_6_front,Main_Video_7_front,Main_Video_8_front,Main_Video_9_front,Main_Video_10_front',
    packshotField: 'Packshot',
    supportsSubtitles: true
  },
  {
    id: '98d7ccf8-03a1-4b8f-b0cf-7b27d40a8853',
    name: '9x16 (clean)',
    size: '9x16-clean',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video_1,Main_Video_2,Main_Video_3,Main_Video_4,Main_Video_5,Main_Video_6,Main_Video_7,Main_Video_8,Main_Video_9,Main_Video_10',
    packshotField: '',
    supportsSubtitles: false
  }
];

// All templates now support dynamic subtitles via opacity control