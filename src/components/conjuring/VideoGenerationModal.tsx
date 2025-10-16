import React, { useState, useEffect } from 'react';
import { generateVideoMotionPrompt } from '@/services/conjuring/geminiService';
import { getPromptConfig } from '@/services/conjuring/promptService';
import type { VideoGenerationModel, VideoGenerationParams, VideoResolution, VideoDuration } from '@/types/conjuring';
import { videoModelDetails } from '@/services/conjuring/costService';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, WandSparkles } from 'lucide-react';

const modelOrder: VideoGenerationModel[] = ['seedance-pro', 'seedance-lite', 'hailuo-2-pro', 'hailuo-2-standard'];

const selectClassName = "flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm ring-offset-black placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

interface VideoGenerationModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  basePrompt: string;
  imageUrl: string;
  onStartGeneration: (params: VideoGenerationParams) => void;
}

export const VideoGenerationModal: React.FC<VideoGenerationModalProps> = ({ isOpen, onOpenChange, basePrompt, imageUrl, onStartGeneration }) => {
  const { toast } = useToast();
  const [videoPrompt, setVideoPrompt] = useState('');
  const [model, setModel] = useState<VideoGenerationModel>('seedance-pro');
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [duration, setDuration] = useState<VideoDuration>('5');
  const [isSuggestingPrompt, setIsSuggestingPrompt] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null);

  console.log('[VideoGenerationModal] Rendered with imageUrl:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'NO URL');
  console.log('[VideoGenerationModal] isOpen:', isOpen);

  const handleModelChange = (newModel: VideoGenerationModel) => {
      setModel(newModel);
      const newModelDetails = videoModelDetails[newModel];
      setResolution(newModelDetails.resolutions[0]);
      setDuration(newModelDetails.durations[0]);
  };

  useEffect(() => {
    if (isOpen) {
      console.log('[VideoGenerationModal] Modal opened, generating video prompt...');
      setIsSuggestingPrompt(true);
      
      // Auto-generate video motion prompt
      const generatePrompt = async () => {
        try {
          // Convert imageUrl to base64 if needed
          let imageBase64: string | undefined;
          let imageMimeType: string | undefined;
          
          if (imageUrl && imageUrl.startsWith('http')) {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            imageMimeType = blob.type;
            imageBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
              };
              reader.readAsDataURL(blob);
            });
          } else if (imageUrl && imageUrl.startsWith('data:')) {
            const parts = imageUrl.split(',');
            imageMimeType = parts[0].match(/:(.*?);/)?.[1];
            imageBase64 = parts[1];
          }
          
          const motionPrompt = await generateVideoMotionPrompt(basePrompt, imageBase64, imageMimeType);
          setVideoPrompt(motionPrompt);
        } catch (error: any) {
          console.error('Failed to generate video prompt:', error);
          toast({
            title: "Error",
            description: "Failed to generate motion prompt. Using base prompt instead.",
            variant: "destructive"
          });
          setVideoPrompt(basePrompt); // Fallback to base prompt
        } finally {
          setIsSuggestingPrompt(false);
        }
      };
      
      generatePrompt();
    }
  }, [isOpen, basePrompt, imageUrl, toast]);
  
  useEffect(() => {
    const cost = videoModelDetails[model].calculateCost(resolution, duration);
    setEstimatedCost(`$${cost.toFixed(3)}`);
  }, [model, resolution, duration]);

  const handleGenerateClick = () => {
    console.log('[VideoGenerationModal] Generate clicked');
    console.log('[VideoGenerationModal] videoPrompt:', videoPrompt);
    console.log('[VideoGenerationModal] imageUrl:', imageUrl ? imageUrl.substring(0, 100) + '...' : 'NO URL');
    console.log('[VideoGenerationModal] model:', model);
    console.log('[VideoGenerationModal] resolution:', resolution);
    console.log('[VideoGenerationModal] duration:', duration);
    
    onStartGeneration({
      prompt: videoPrompt,
      resolution,
      duration,
      model,
    });
    onOpenChange(false); // Close modal after starting
  };
  
  if (!isOpen) {
      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Video From Image</DialogTitle>
          <DialogDescription>
            Adjust the settings below to generate a video. The generation process will appear in the sidebar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
                <img src={imageUrl} alt="Source for video" className="rounded-lg w-full object-contain aspect-[9/16] bg-black"/>
            </div>
            <div className="md:col-span-1 space-y-4">
                <div>
                    <Label htmlFor="video-prompt">Motion Prompt</Label>
                    <Textarea
                        id="video-prompt"
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder="e.g., A gentle breeze rustles the leaves..."
                        className="mt-1"
                        disabled={isSuggestingPrompt}
                    />
                    {isSuggestingPrompt && <p className="text-xs text-zinc-400 mt-1 flex items-center"><Loader2 className="w-3 h-3 mr-1 animate-spin"/>Suggesting a prompt...</p>}
                </div>
                 <div>
                    <Label htmlFor="video-model">Model</Label>
                    <select id="video-model" value={model} onChange={e => handleModelChange(e.target.value as VideoGenerationModel)} className={`${selectClassName} mt-1`}>
                         {modelOrder.map(modelKey => (
                            <option key={modelKey} value={modelKey}>{videoModelDetails[modelKey].name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-zinc-400 mt-1">{videoModelDetails[model].description}</p>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <Label htmlFor="video-resolution">Resolution</Label>
                         <select id="video-resolution" value={resolution} onChange={e => setResolution(e.target.value as VideoResolution)} className={`${selectClassName} mt-1`}>
                            {videoModelDetails[model].resolutions.map((res: VideoResolution) => {
                                let label: string = res;
                                if (res === '1080p') label = '1080p (Quality)';
                                else if (res === '768p') label = '768p (HD)';
                                else if (res === '720p') label = '720p (Balanced)';
                                else if (res === '512p') label = '512p (Standard)';
                                else if (res === '480p') label = '480p (Fast)';
                                return <option key={res} value={res}>{label}</option>;
                            })}
                        </select>
                    </div>
                     <div>
                        <Label htmlFor="video-duration">Duration (s)</Label>
                        <select id="video-duration" value={duration} onChange={e => setDuration(e.target.value as VideoDuration)} className={`${selectClassName} mt-1`}>
                            {videoModelDetails[model].durations.map((d: VideoDuration) => (
                                <option key={d} value={String(d)}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <Label>Estimated Cost</Label>
                    <p className="font-semibold text-zinc-50 text-lg h-10 flex items-center">{estimatedCost}</p>
                </div>
            </div>
        </div>
        <DialogFooter>
            <Button onClick={() => onOpenChange(false)} variant="outline">Cancel</Button>
            <Button onClick={handleGenerateClick} disabled={isSuggestingPrompt || !videoPrompt || !imageUrl}>
                <WandSparkles className="mr-2 h-4 w-4"/>
                Generate Video
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
