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

  async renderVideo(template: CreatomateTemplate, videoFile: File, packshotUrl: string): Promise<string> {
    console.log(`🎬 Starting render for template: ${template.name} (${template.id})`);
    console.log(`📹 Video file: ${videoFile.name} (${videoFile.size} bytes)`);
    console.log(`🎯 Packshot URL: ${packshotUrl}`);
    
    // Upload the video file first
    const formData = new FormData();
    formData.append('source', videoFile);

    const uploadResponse = await fetch(`${this.baseUrl}/sources`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.error('❌ Video upload failed:', uploadResponse.status, uploadResponse.statusText);
      throw new Error('Failed to upload video file');
    }

    const uploadData = await uploadResponse.json();
    const videoUrl = uploadData.url;
    console.log(`✅ Video uploaded successfully: ${videoUrl}`);

    // Start rendering with the uploaded files
    const modifications: any = {
      [template.packshotField]: packshotUrl,
    };
    
    // Add main video field(s)
    if (template.mainVideoField.includes(',')) {
      // Multiple main video fields (like for square template)
      template.mainVideoField.split(',').forEach(field => {
        modifications[field.trim()] = videoUrl;
      });
    } else {
      modifications[template.mainVideoField] = videoUrl;
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
      const pollInterval = setInterval(async () => {
        try {
          const status = await this.getRenderStatus(renderId);
          
          if (status.progress && onProgress) {
            onProgress(status.progress);
          }

          if (status.status === 'succeeded' && status.url) {
            clearInterval(pollInterval);
            resolve(status.url);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'Rendering failed'));
          }
          // Continue polling if status is 'pending' or 'processing'
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000); // Poll every 2 seconds
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
    mainVideoField: 'Main_Video.provider',
    packshotField: 'Packshot.provider'
  },
  {
    id: '41e18070-2198-43f2-9503-807fbbd5f749',
    name: '1:1 Квадратное',
    size: 'square',
    dimensions: '1080x1080',
    mainVideoField: 'Main_Video-HXB.provider, Main_Video.provider',
    packshotField: 'Packshot.provider'
  },
  {
    id: 'c9aa2c57-d883-4a1e-85dd-020f4e911a70',
    name: '16:9 Горизонтальное',
    size: 'horizontal',
    dimensions: '1920x1080',
    mainVideoField: 'Main_Video-HW8.provider',
    packshotField: 'Packshot.provider'
  }
];