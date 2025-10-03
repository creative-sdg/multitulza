import type { GeneratedMedia, HistoryItem, VideoDuration, VideoGenerationModel, VideoResolution } from '@/types/conjuring';

const getVideoDimensions = (res: VideoResolution): { width: number, height: number } => {
    const height = parseInt(res.replace('p', ''));
    const width = Math.round(height * 16 / 9);
    return { width, height };
};

interface ModelDetail {
    name: string;
    resolutions: VideoResolution[];
    durations: VideoDuration[];
    calculateCost: (res: VideoResolution, dur: VideoDuration) => number;
    description: string;
}

export const videoModelDetails: Record<VideoGenerationModel, ModelDetail> = {
    'seedance-pro': {
        name: 'Seedance Pro',
        resolutions: ['1080p', '720p', '480p'],
        durations: Array.from({ length: 10 }, (_, i) => String(i + 3)) as VideoDuration[],
        calculateCost: (res: VideoResolution, dur: VideoDuration): number => {
            const durationSeconds = parseInt(dur, 10);
            const { width, height } = getVideoDimensions(res);
            const FPS = 24;
            const tokens = (height * width * FPS * durationSeconds) / 1024;
            return (tokens / 1_000_000) * 2.5;
        },
        description: 'Offers good quality and control. A 1080p 5-second video costs ~$0.62.'
    },
    'seedance-lite': {
        name: 'Seedance Lite',
        resolutions: ['1080p', '720p', '480p'],
        durations: Array.from({ length: 10 }, (_, i) => String(i + 3)) as VideoDuration[],
        calculateCost: (res: VideoResolution, dur: VideoDuration): number => {
            const durationSeconds = parseInt(dur, 10);
            const { width, height } = getVideoDimensions(res);
            const FPS = 24;
            const tokens = (height * width * FPS * durationSeconds) / 1024;
            return (tokens / 1_000_000) * 1.8;
        },
        description: 'A faster, lower-cost alternative. A 720p 5-second video costs ~$0.18.'
    },
    'hailuo-2-pro': {
        name: 'Hailuo 2 Pro',
        resolutions: ['1080p'],
        durations: ['6'] as VideoDuration[],
        calculateCost: (_res, dur) => parseInt(dur, 10) * 0.08,
        description: 'High-quality 1080p generation. Recommended for scenes with fast movement.'
    },
    'hailuo-2-standard': {
        name: 'Hailuo 2 Standard',
        resolutions: ['768p', '512p'],
        durations: ['6', '10'] as VideoDuration[],
        calculateCost: (res, dur) => {
            const costPerSecond = res === '768p' ? 0.045 : 0.017;
            return parseInt(dur, 10) * costPerSecond;
        },
        description: 'Generates 768p or 512p video. A 6s 768p video costs ~$0.27.'
    }
};

const IMAGE_COSTS: Record<string, number> = {
    'nano-banana': 0.04,
    'seedream-v3': 0.03,
};

export const calculateMediaCost = (media: GeneratedMedia): number => {
    if (media.type === 'image' && media.model && IMAGE_COSTS[media.model]) {
        return IMAGE_COSTS[media.model];
    }
    if (media.type === 'video' && media.model && media.resolution && media.duration) {
        const modelKey = media.model as VideoGenerationModel;
        if (videoModelDetails[modelKey]) {
            return videoModelDetails[modelKey].calculateCost(media.resolution, media.duration);
        }
    }
    return 0;
};

export const calculateHistoryItemCost = (item: HistoryItem): number => {
    if (item.id === 'text-to-image-generations') {
        return 0; // Text-to-image is not tied to a character, so we don't count its cost here.
    }
    
    return item.imagePrompts.reduce((totalCost, prompt) => {
        const promptCost = (prompt.generatedMedia || []).reduce((promptTotal, media) => {
            return promptTotal + calculateMediaCost(media);
        }, 0);
        return totalCost + promptCost;
    }, 0);
};
