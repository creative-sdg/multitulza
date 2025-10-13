

import { fal } from '@fal-ai/client';
import type { ImageGenerationModel, VideoGenerationModel, VideoResolution, VideoDuration, GeneratedMedia } from '@/types/conjuring';
import { optimizePrompt } from '@/utils/conjuring/promptOptimizer';

const FAL_API_KEY_STORAGE_KEY = 'fal-api-key';

export const saveFalApiKey = (key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(FAL_API_KEY_STORAGE_KEY, key);
    }
};

export const hasFalApiKey = (): boolean => {
    if (typeof window !== 'undefined' && localStorage.getItem(FAL_API_KEY_STORAGE_KEY)) {
        return true;
    }
    return !!process.env.FAL_API_KEY;
};

const getApiKey = (): string => {
    let apiKey: string | null = null;
    if (typeof window !== 'undefined') {
        apiKey = localStorage.getItem(FAL_API_KEY_STORAGE_KEY);
    }

    if (!apiKey) {
        apiKey = process.env.FAL_API_KEY;
    }

    if (!apiKey) {
        throw new Error("Fal.ai API key not found. Please set it in settings or as an FAL_API_KEY environment variable.");
    }
    return apiKey;
}

export const generateImageFal = async (prompt: string, imageBlob: Blob, model: ImageGenerationModel, companionImageBlob: Blob | null = null): Promise<string> => {
    const apiKey = getApiKey();
    
    fal.config({
      credentials: apiKey,
    });
    
    try {
        let result: any;

        // Optimize prompt for nano-banana
        const optimizedPrompt = optimizePrompt(prompt, 'nano-banana');
        console.log('Original prompt:', prompt);
        console.log('Optimized for nano-banana:', optimizedPrompt);
        
        const modelId = 'fal-ai/nano-banana/edit';
        
        const imageUrls: string[] = [];
        const mainImageUrl = await fal.storage.upload(imageBlob);
        imageUrls.push(mainImageUrl);

        if (companionImageBlob) {
            const companionUrl = await fal.storage.upload(companionImageBlob);
            imageUrls.push(companionUrl);
        }
        
        result = await fal.subscribe(modelId, {
            input: {
                prompt: optimizedPrompt,
                image_urls: imageUrls,
            },
        });

        const output = result.data;

        if (!output || !output.images || !Array.isArray(output.images) || output.images.length === 0 || !output.images[0].url) {
            console.error(`Invalid response structure from Fal.ai for model ${model}:`, JSON.stringify(result, null, 2));
            throw new Error("The API did not return a valid image URL. Check the console for the full response object.");
        }

        return output.images[0].url;

    } catch (error: any) {
        console.error("Fal.ai service error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};

// FIX: Expanded the `FalAspectRatio` type to include '21:9' and '9:21' to support additional AI reframe options.
export type FalAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '9:21';
type SeedreamImageSize = 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';

const aspectRatioToSeedreamSize = (aspectRatio: FalAspectRatio): SeedreamImageSize => {
    switch (aspectRatio) {
        case '1:1': return 'square_hd';
        case '16:9': return 'landscape_16_9';
        case '9:16': return 'portrait_16_9';
        case '4:3': return 'landscape_4_3';
        case '3:4': return 'portrait_4_3';
        default: return 'square_hd';
    }
};

export const generateImageFromTextFal = async (prompt: string, numImages: number, aspectRatio: FalAspectRatio): Promise<GeneratedMedia[]> => {
    const apiKey = getApiKey();
    
    fal.config({
      credentials: apiKey,
    });

    try {
        const modelId = 'fal-ai/bytedance/seedream/v3/text-to-image';
        const result: any = await fal.subscribe(modelId, {
            input: {
                prompt,
                num_images: numImages,
                image_size: aspectRatioToSeedreamSize(aspectRatio),
            },
        });

        const output = result.data;

        if (!output || !output.images || !Array.isArray(output.images) || output.images.length === 0) {
            console.error(`Invalid response structure from Fal.ai for model ${modelId}:`, JSON.stringify(result, null, 2));
            throw new Error("The API did not return any valid image URLs.");
        }
        
        const generatedMedia: GeneratedMedia[] = output.images.map((image: any) => ({
            prompt: prompt,
            url: image.url,
            type: 'image',
            model: 'seedream-v3',
            width: image.width,
            height: image.height,
            size: image.file_size,
            scene: 'Image Generation',
            seed: output.seed,
        }));

        return generatedMedia;

    } catch (error: any) {
        console.error("Fal.ai text-to-image service error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};

export const reframeImageFal = async (imageBlob: Blob, aspectRatio: FalAspectRatio): Promise<string> => {
    const apiKey = getApiKey();
    
    fal.config({
      credentials: apiKey,
    });
    
    try {
        const imageUrl = await fal.storage.upload(imageBlob);
        const modelId = 'fal-ai/luma-photon/flash/reframe';

        const result: any = await fal.subscribe(modelId, {
            input: {
                image_url: imageUrl,
                aspect_ratio: aspectRatio,
            },
        });

        const output = result.data;

        if (!output || !output.images || !Array.isArray(output.images) || output.images.length === 0 || !output.images[0].url) {
            console.error(`Invalid response structure from Fal.ai for model ${modelId}:`, JSON.stringify(result, null, 2));
            throw new Error("The AI reframe API did not return a valid image URL.");
        }

        return output.images[0].url;

    } catch (error: any) {
        console.error("Fal.ai reframe service error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};

interface GenerateVideoOptions {
    prompt: string;
    imageUrl: string;
    resolution: VideoResolution;
    duration: VideoDuration;
    model: VideoGenerationModel;
    onProgress: (logs: any[]) => void;
}


export const generateVideoFal = async ({
    prompt,
    imageUrl,
    resolution,
    duration,
    model,
    onProgress
}: GenerateVideoOptions): Promise<string> => {
    const apiKey = getApiKey();
    
    fal.config({
      credentials: apiKey,
    });

    try {
        // If imageUrl is a data URL or blob URL, upload it to Fal Storage first
        let finalImageUrl = imageUrl;
        if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
            console.log('[falService] Uploading image to Fal Storage...');
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            finalImageUrl = await uploadImageToFalStorage(blob);
            console.log('[falService] Image uploaded to Fal Storage:', finalImageUrl);
        }

        let modelId: string;
        let modelInput: any;

        switch (model) {
            case 'seedance-pro':
                modelId = 'fal-ai/bytedance/seedance/v1/pro/image-to-video';
                modelInput = { prompt, image_url: finalImageUrl, resolution, duration };
                break;
            case 'seedance-lite':
                modelId = 'fal-ai/bytedance/seedance/v1/lite/image-to-video';
                modelInput = { prompt, image_url: finalImageUrl, resolution, duration };
                break;
            case 'hailuo-2-standard':
                modelId = 'fal-ai/minimax/hailuo-02/standard/image-to-video';
                modelInput = { prompt, image_url: finalImageUrl, duration_in_seconds: parseInt(duration, 10), height: parseInt(resolution.replace('p', '')) };
                break;
            case 'hailuo-2-pro':
                modelId = 'fal-ai/minimax/hailuo-02/pro/image-to-video';
                modelInput = { prompt, image_url: finalImageUrl, duration_in_seconds: parseInt(duration, 10), height: parseInt(resolution.replace('p', '')) };
                break;
            default:
                throw new Error(`Unsupported video model: ${model}`);
        }

        const result: any = await fal.subscribe(modelId, {
            input: modelInput,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_PROGRESS" && update.logs) {
                    onProgress(update.logs);
                }
            },
        });

        const output = result.data;
        
        if (!output || !output.video || !output.video.url) {
            console.error("Invalid response structure from Fal.ai for video generation:", JSON.stringify(result, null, 2));
            throw new Error("The API did not return a valid video URL. Check the console for the full response object.");
        }

        return output.video.url;

    } catch (error: any) {
        console.error("Fal.ai video service error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};

export const uploadImageToFalStorage = async (imageBlob: Blob): Promise<string> => {
    const apiKey = getApiKey();
    fal.config({
        credentials: apiKey,
    });
    try {
        // Convert Blob to File with proper name and type
        const file = new File([imageBlob], `image-${Date.now()}.jpg`, { 
            type: imageBlob.type || 'image/jpeg' 
        });
        const url = await fal.storage.upload(file);
        return url;
    } catch (error: any) {
        console.error("Fal.ai storage upload error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};

export const editImageFal = async (
    prompt: string, 
    imageBlob: Blob, 
    numImages: number
): Promise<GeneratedMedia[]> => {
    const apiKey = getApiKey();
    fal.config({ 
        credentials: apiKey 
    });

    try {
        // Optimize prompt for nano-banana
        const optimizedPrompt = optimizePrompt(prompt, 'nano-banana');
        console.log('Original prompt:', prompt);
        console.log('Optimized for nano-banana:', optimizedPrompt);
        
        const modelId = 'fal-ai/nano-banana/edit';
        // Convert Blob to File with proper name and type
        const file = new File([imageBlob], `image-${Date.now()}.jpg`, { 
            type: imageBlob.type || 'image/jpeg' 
        });
        const imageUrl = await fal.storage.upload(file);

        const result: any = await fal.subscribe(modelId, {
            input: {
                prompt: optimizedPrompt,
                image_urls: [imageUrl],
                num_images: numImages,
            },
        });

        const output = result.data;
        if (!output || !output.images || !Array.isArray(output.images) || output.images.length === 0) {
            console.error(`Invalid response structure from Fal.ai for model ${modelId}:`, JSON.stringify(result, null, 2));
            throw new Error("The API did not return any valid image URLs.");
        }

        const generatedMedia: GeneratedMedia[] = output.images.map((image: any) => ({
            prompt: prompt,
            url: image.url,
            type: 'image',
            model: 'nano-banana',
            width: image.width,
            height: image.height,
            size: image.file_size,
            scene: 'AI Edit',
            seed: output.seed,
        }));

        return generatedMedia;

    } catch (error: any) {
        console.error("Fal.ai image edit service error:", error);
        const detail = error.detail || error.message || 'An unknown error occurred.';
        throw new Error(`Fal.ai API Error: ${detail}`);
    }
};