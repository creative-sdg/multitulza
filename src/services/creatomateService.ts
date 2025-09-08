interface CreatomateTemplate {
  id: string;
  name: string;
  size: string;
  dimensions: string;
  mainVideoField: string;
  packshotField: string;
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

  async renderVideo(
    template: CreatomateTemplate, 
    videoUrl: string, 
    packshotUrl: string, 
    options?: {
      enableSubtitles?: boolean;
      enablePackshot?: boolean;
    }
  ): Promise<string> {
    console.log(`🎬 Starting render for template: ${template.name} (${template.id})`);
    console.log(`📹 Video URL: ${videoUrl}`);
    console.log(`🎯 Packshot URL: ${packshotUrl}`);
    console.log(`📝 Subtitles enabled: ${options?.enableSubtitles ?? true}`);
    console.log(`🎯 Packshot enabled: ${options?.enablePackshot ?? true}`);
    
    // Start rendering with the URLs
    const modifications: any = {};
    
    // Only add packshot if enabled
    if (options?.enablePackshot !== false && packshotUrl) {
      modifications[template.packshotField] = packshotUrl;
    }
    
    // Add main video field(s) with trim settings in source
    const videoSettings: any = { source: videoUrl };
    
    // Trimming disabled as per request — use template defaults for timing

    
    if (template.mainVideoField.includes(',')) {
      // Multiple main video fields (like for horizontal template)
      template.mainVideoField.split(',').forEach(field => {
        const fieldName = field.trim();
        modifications[fieldName] = videoSettings;
      });
    } else {
      modifications[template.mainVideoField] = videoSettings;
    }

    // Handle subtitles - set transcript source when enabled
    if (options?.enableSubtitles !== false) {
      // Set subtitle source to first main video field
      const firstVideoField = template.mainVideoField.includes(',') 
        ? template.mainVideoField.split(',')[0].trim()
        : template.mainVideoField;
      modifications['Subtitles-auto.transcript_source'] = firstVideoField;
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
}

// Available brands with their packshot URLs
export const AVAILABLE_BRANDS = [
  { 
    id: 'datemyage', 
    name: 'DateMyAge',
    packshots: {
      vertical: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_9x16.mp4',
      square: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_1x1.mp4',
      horizontal: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_16x9.mp4'
    }
  },
  { 
    id: 'dating', 
    name: 'Dating.Com',
    packshots: {
      vertical: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/dc_packshot_simple_languages_1080x1920.mp4',
      square: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/dc_packshot_simple_languages_1080x1080.mp4',
      horizontal: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/dc_packshot_simple_languages_1920x1080.mp4'
    }
  },
  { 
    id: 'youtravelmate', 
    name: 'YouTravelMate',
    packshots: {
      vertical: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_9x16.mp4',
      square: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_1x1.mp4',
      horizontal: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_16x9.mp4'
    }
  },
  { 
    id: 'onelove', 
    name: 'OneLove',
    packshots: {
      vertical: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_9x16.mp4',
      square: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_1x1.mp4',
      horizontal: 'https://kyasmnsbddufkyhcdroj.supabase.co/storage/v1/object/public/packshots/DateMyAge_packshot_16x9.mp4'
    }
  }
];

// Template configurations with real Creatomate template IDs
export const CREATOMATE_TEMPLATES: CreatomateTemplate[] = [
  {
    id: 'ae386c9d-1bd5-4234-88df-b6c636d98c9d',
    name: '9:16 Вертикальное',
    size: 'vertical',
    dimensions: '1080x1920',
    mainVideoField: 'Main_Video',
    packshotField: 'Packshot'
  },
  {
    id: 'c9aa2c57-d883-4a1e-85dd-020f4e911a70',
    name: '16:9 Горизонтальное',
    size: 'horizontal',
    dimensions: '1920x1080',
    mainVideoField: 'Main_Video_front, Main_Video_back',
    packshotField: 'Packshot'
  },
  {
    id: '41e18070-2198-43f2-9503-807fbbd5f749',
    name: '1:1 Квадратное',
    size: 'square',
    dimensions: '1080x1080',
    mainVideoField: 'Main_Video_front, Main_Video_back',
    packshotField: 'Packshot'
  }
];