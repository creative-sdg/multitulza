interface CreatomateTemplate {
  id: string;
  name: string;
  size: string;
  ending: string;
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
  private baseUrl = 'https://api.creatomate.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Creatomate API error: ${response.statusText}`);
    }

    return response.json();
  }

  async renderVideo(templateId: string, videoFile: File): Promise<string> {
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
      throw new Error('Failed to upload video file');
    }

    const uploadData = await uploadResponse.json();
    const videoUrl = uploadData.url;

    // Start rendering with the uploaded video
    const renderRequest: CreatomateRenderRequest = {
      template_id: templateId,
      modifications: {
        'source-video': videoUrl, // This key should match your template's video element name
      },
    };

    const renderResponse = await this.makeRequest('/renders', 'POST', renderRequest);
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

// Template configurations - update these with your actual Creatomate template IDs
export const CREATOMATE_TEMPLATES: CreatomateTemplate[] = [
  // Square templates
  { id: 'your-square-cta1-template-id', name: '1:1 Square - Концовка A', size: '1080x1080', ending: 'cta1' },
  { id: 'your-square-cta2-template-id', name: '1:1 Square - Концовка B', size: '1080x1080', ending: 'cta2' },
  
  // Vertical templates  
  { id: 'your-vertical-cta1-template-id', name: '9:16 Vertical - Концовка A', size: '1080x1920', ending: 'cta1' },
  { id: 'your-vertical-cta2-template-id', name: '9:16 Vertical - Концовка B', size: '1080x1920', ending: 'cta2' },
  
  // Horizontal templates
  { id: 'your-horizontal-cta1-template-id', name: '16:9 Horizontal - Концовка A', size: '1920x1080', ending: 'cta1' },
  { id: 'your-horizontal-cta2-template-id', name: '16:9 Horizontal - Концовка B', size: '1920x1080', ending: 'cta2' },
];