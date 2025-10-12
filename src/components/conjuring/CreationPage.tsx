import React, { useState, useEffect } from 'react';
import { generatePromptVariations } from '@/services/conjuring/geminiService';
import { hasFalApiKey } from '@/services/conjuring/falService';
import { VideoGenerationModal } from './VideoGenerationModal';
import { ImageModelSelectionModal } from './ImageGenerationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter as ViewerDialogFooter } from '@/components/ui/dialog';
import { Loader2, Sparkles, WandSparkles, Download, Star, Trash2, Video, Crop } from 'lucide-react';
import type { GeneratedMedia, ImageGenerationModel, VideoGenerationParams } from '@/types/conjuring';
import { cn } from '@/lib/utils';

interface CreationPageProps {
  characterId: string;
  promptIndex: number;
  characterName: string;
  scene: string;
  prompt: string;
  initialVariations: string[];
  generatedMedia: GeneratedMedia[];
  originalImageUrl: string;
  companionImageUrl: string | null;
  onVariationsGenerated: (variations: string[]) => void;
  onGeneratedMediaUpdate: (variations: GeneratedMedia[]) => void;
  onImageGenerated: (imageUrl: string) => void;
  onOpenSettings: () => void;
  onStartReframe: (media: GeneratedMedia) => void;
  onToggleFavorite: (media: GeneratedMedia) => void;
  // Background job props
  imageGenerationJobs: Map<string, { prompt: string; error?: string; characterId: string; promptIndex: number; }>;
  videoGenerationJob: { imageUrl: string; logs: any[]; error?: string; characterId: string; promptIndex: number; } | null;
  onStartImageGeneration: (prompts: string[], model: ImageGenerationModel, characterId: string, baseImageUrl: string, companionImageUrl: string | null) => void;
  onStartVideoGeneration: (params: VideoGenerationParams, characterId: string, promptIndex: number, sourceMedia: GeneratedMedia) => void;
  onCancelImageJob: (jobId: string) => void;
  onCancelVideoJob: () => void;
}

const ImageGenerationProgressItem: React.FC<{
  prompt: string;
  error?: string;
  onCancel: () => void;
}> = ({ prompt, error, onCancel }) => (
  <div className="relative group aspect-[9/16] bg-zinc-900 rounded-md p-3 flex flex-col justify-between border border-zinc-700">
    <div>
      <p className="text-xs text-zinc-400 line-clamp-4 font-medium">{prompt}</p>
    </div>
    <div className="flex flex-col gap-2 mt-2">
      {error ? (
        <>
          <p className="text-xs text-red-400 line-clamp-3">Error: {error}</p>
          <Button onClick={onCancel} variant="destructive" size="sm" className="w-full">Close</Button>
        </>
      ) : (
        <>
          <div className="flex items-center text-xs text-zinc-300">
            <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            <span>Generating...</span>
          </div>
          <Button onClick={onCancel} variant="outline" size="sm" className="w-full">Cancel</Button>
        </>
      )}
    </div>
  </div>
);


const VideoGenerationProgressItem: React.FC<{
  imageUrl: string;
  error?: string;
  onCancel: () => void;
}> = ({ imageUrl, error, onCancel }) => (
  <div className="relative group aspect-[9/16] bg-zinc-900 rounded-md p-3 flex flex-col justify-between border border-zinc-700">
    <img src={imageUrl} alt="Source for video" className="absolute inset-0 w-full h-full object-cover rounded-md opacity-30" />
    <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
            <p className="text-xs text-zinc-200 font-medium">
                {error ? 'Generation Failed' : 'Generating Video...'}
            </p>
        </div>
        <div className="flex flex-col gap-2 mt-2">
        {error ? (
            <>
            <p className="text-xs text-red-400 line-clamp-3">Error: {error}</p>
            <Button onClick={onCancel} variant="destructive" size="sm" className="w-full">Close</Button>
            </>
        ) : (
            <>
            <div className="flex items-center text-xs text-zinc-300">
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                <span>Processing...</span>
            </div>
            <Button onClick={onCancel} variant="outline" size="sm" className="w-full">Cancel</Button>
            </>
        )}
        </div>
    </div>
  </div>
);


export const CreationPage: React.FC<CreationPageProps> = ({ 
    characterId, promptIndex, characterName, scene, prompt, initialVariations, generatedMedia, originalImageUrl, companionImageUrl, onVariationsGenerated, onGeneratedMediaUpdate, onImageGenerated, onOpenSettings, onStartReframe, onToggleFavorite,
    imageGenerationJobs, videoGenerationJob, onStartImageGeneration, onStartVideoGeneration, onCancelImageJob, onCancelVideoJob
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  const [variations, setVariations] = useState<string[]>(initialVariations);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewingMediaIndex, setViewingMediaIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [mediaForVideoGen, setMediaForVideoGen] = useState<GeneratedMedia | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  
  const [isModelSelectionOpen, setIsModelSelectionOpen] = useState(false);
  const [promptsToGenerate, setPromptsToGenerate] = useState<string[]>([]);
  const [numImagesToGenerate, setNumImagesToGenerate] = useState(0);
  
  useEffect(() => {
    setVariations(initialVariations);
  }, [initialVariations]);


  const handleGenerateVariations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePromptVariations(currentPrompt);
      setVariations(result);
      onVariationsGenerated(result);
    } catch (e: any) {
      console.error("Failed to generate variations:", e);
      setError(e.message || "An error occurred while generating prompt variations.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVariationChange = (index: number, newPrompt: string) => {
    const newVariations = [...variations];
    newVariations[index] = newPrompt;
    setVariations(newVariations);
    onVariationsGenerated(newVariations);
  };

  const openModelSelectionForPrompts = (prompts: string[]) => {
    if (!hasFalApiKey()) {
      setError("Fal.ai API key is not set. Please add it in the settings before generating images.");
      onOpenSettings();
      return;
    }
    if (prompts && prompts.length > 0) {
        setPromptsToGenerate(prompts);
        setNumImagesToGenerate(prompts.length);
        setIsModelSelectionOpen(true);
    }
  };

  const handleStartImageGeneration = async (model: ImageGenerationModel) => {
    if (promptsToGenerate.length === 0) return;
    onStartImageGeneration(promptsToGenerate, model, characterId, originalImageUrl, companionImageUrl);
    setPromptsToGenerate([]);
    setIsModelSelectionOpen(false);
  };

  const handleOpenVideoModal = (media: GeneratedMedia) => {
    if (!hasFalApiKey()) {
      setError("Fal.ai API key is not set. Please add it in the settings before generating videos.");
      onOpenSettings();
      return;
    }
    setMediaForVideoGen(media);
    setIsVideoModalOpen(true);
  };
  
  const handleStartVideoGeneration = async (params: VideoGenerationParams) => {
    if (!mediaForVideoGen) return;
    onStartVideoGeneration(params, characterId, promptIndex, mediaForVideoGen);
  };

  const handleSetAsMainImage = (media: GeneratedMedia) => {
    onImageGenerated(media.url);
  };

  const handleDeleteMedia = (index: number) => {
    const newMediaList = generatedMedia.filter((_, i) => i !== index);
    onGeneratedMediaUpdate(newMediaList);
  };
  
  const handleDownloadMedia = async (media: GeneratedMedia) => {
    setIsDownloading(true);
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const fileExtension = media.type === 'video' ? 'mp4' : 'png';
      const fileName = `${scene.replace(/ /g, '_')}_${new Date().getTime()}.${fileExtension}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Download failed:', err);
      setError('Could not download the file.');
    } finally {
      setIsDownloading(false);
    }
  };

  const relevantImageJobs = Array.from(imageGenerationJobs.entries())
    .filter(([, job]) => job.characterId === characterId && job.promptIndex === promptIndex);

  const relevantVideoJob = videoGenerationJob?.characterId === characterId && videoGenerationJob?.promptIndex === promptIndex 
    ? videoGenerationJob 
    : null;

  return (
    <>
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 lg:h-[calc(100vh-9rem)]">
        <Card className="bg-zinc-950/50 border-zinc-800 h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">{characterName} - {scene}</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-y-auto">
            <div>
              <Label htmlFor="current-prompt">Main Prompt</Label>
              <Textarea
                id="current-prompt"
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="mt-1"
              />
            </div>
            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
             {variations.length > 0 && (
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Prompt Variations</h2>
                </div>
                <div className="space-y-4">
                  {variations.map((v, i) => (
                    <div key={i}>
                      <Label htmlFor={`variation-${i}`} className="text-sm font-medium text-zinc-400">
                        Variation {i + 1}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Textarea
                          id={`variation-${i}`}
                          value={v}
                          onChange={(e) => handleVariationChange(i, e.target.value)}
                          className=""
                        />
                        <Button
                          onClick={() => openModelSelectionForPrompts([v])}
                          variant="secondary"
                          size="sm"
                          className="flex-shrink-0"
                          aria-label="Generate image from this variation"
                        >
                          <WandSparkles className="w-4 h-4 mr-2" />
                          Generate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-2 pt-6">
            <Button onClick={() => openModelSelectionForPrompts([currentPrompt])} className="w-full" size="lg">
              <WandSparkles className="mr-2 h-4 w-4" />
              Generate with this prompt
            </Button>
            
            {variations.length === 0 ? (
                <Button onClick={handleGenerateVariations} disabled={isLoading} variant="secondary" className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Variations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Suggest 3 Variations
                    </>
                  )}
                </Button>
            ) : (
                <div className="w-full flex flex-col gap-2">
                    <Button onClick={() => openModelSelectionForPrompts(variations)} className="w-full" variant="secondary">
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Generate All Variations
                    </Button>
                    <Button onClick={handleGenerateVariations} disabled={isLoading} variant="secondary" className="w-full">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Suggesting...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Suggest New Variations
                            </>
                        )}
                    </Button>
                </div>
            )}
          </CardFooter>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-6 lg:h-[calc(100vh-9rem)] flex flex-col">
        <div className="flex-grow flex flex-col min-h-0">
            <h2 className="text-2xl font-bold text-white mb-4 flex-shrink-0">Generated Media</h2>
            {generatedMedia.length === 0 && relevantImageJobs.length === 0 && !relevantVideoJob && (
              <div className="text-center py-16 px-6 border-2 border-dashed border-zinc-800 rounded-lg flex-grow">
                <p className="text-zinc-400">Your generated images and videos will appear here.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 overflow-y-auto">
              {relevantVideoJob && (
                <VideoGenerationProgressItem
                  key="video-job"
                  imageUrl={relevantVideoJob.imageUrl}
                  error={relevantVideoJob.error}
                  onCancel={onCancelVideoJob}
                />
              )}
              {relevantImageJobs.map(([jobId, job]) => (
                  <ImageGenerationProgressItem
                      key={jobId}
                      prompt={job.prompt}
                      error={job.error}
                      onCancel={() => onCancelImageJob(jobId)}
                  />
              ))}
              {generatedMedia.map((media, index) => (
                <div key={index} className="relative group aspect-[9/16]">
                  <div className="w-full h-full cursor-pointer" onClick={() => setViewingMediaIndex(index)}>
                    {media.type === 'image' ? (
                      <img src={media.url} alt={media.prompt} className="w-full h-full object-cover rounded-md bg-zinc-900" />
                    ) : (
                      <div className="w-full h-full bg-black rounded-md flex items-center justify-center">
                        <video src={media.url} className="w-full h-full object-cover" loop autoPlay muted playsInline />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Video className="w-10 h-10 text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                      <p className="text-white text-xs p-2 text-center line-clamp-3">{media.prompt}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(media); }} className="absolute top-2 right-2 z-20 p-1.5 bg-black/50 rounded-full hover:bg-black/75 transition-colors" aria-label="Toggle favorite">
                    <Star className={cn('w-4 h-4 transition-colors', media.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white/80 hover:text-white')} />
                  </button>
                </div>
              ))}
            </div>
        </div>
      </div>
      
      {viewingMediaIndex !== null && generatedMedia[viewingMediaIndex] && (
        <Dialog open={viewingMediaIndex !== null} onOpenChange={(isOpen) => !isOpen && setViewingMediaIndex(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
              <div className="grid grid-cols-1 md:grid-cols-3 h-full overflow-hidden">
                <div className="md:col-span-2 flex items-center justify-center bg-black p-4 min-h-[60vh]">
                  {generatedMedia[viewingMediaIndex].type === 'image' ? (
                    <img src={generatedMedia[viewingMediaIndex].url} alt={generatedMedia[viewingMediaIndex].prompt} className="w-full h-full object-contain"/>
                  ) : (
                    <video src={generatedMedia[viewingMediaIndex].url} className="w-full h-full object-contain" controls autoPlay loop />
                  )}
                </div>
                <div className="md:col-span-1 bg-zinc-950 p-6 flex flex-col justify-between overflow-y-auto">
                    <div>
                        <h3 className="font-semibold text-lg text-zinc-100 mb-2">Details</h3>
                        <p className="text-sm text-zinc-400 mb-4 h-24 overflow-y-auto">{generatedMedia[viewingMediaIndex].prompt}</p>
                        <div className="text-xs text-zinc-500 space-y-1">
                            {generatedMedia[viewingMediaIndex].model && <p><strong>Model:</strong> {generatedMedia[viewingMediaIndex].model}</p>}
                            {generatedMedia[viewingMediaIndex].width && generatedMedia[viewingMediaIndex].height && <p><strong>Dimensions:</strong> {generatedMedia[viewingMediaIndex].width} x {generatedMedia[viewingMediaIndex].height}</p>}
                            {generatedMedia[viewingMediaIndex].size && <p><strong>Size:</strong> {(generatedMedia[viewingMediaIndex].size / 1024 / 1024).toFixed(2)} MB</p>}
                        </div>
                    </div>
                    <ViewerDialogFooter className="mt-6">
                       <div className="grid grid-cols-2 gap-2">
                          {generatedMedia[viewingMediaIndex].type === 'image' && (
                            <>
                                <Button onClick={() => handleSetAsMainImage(generatedMedia[viewingMediaIndex])} className="w-full">
                                   <Star className="mr-2 h-4 w-4" />
                                   Set as Main
                                </Button>
                                <Button onClick={() => {
                                    onStartReframe(generatedMedia[viewingMediaIndex]);
                                    setViewingMediaIndex(null);
                                }} variant="secondary" className="w-full">
                                    <Crop className="mr-2 h-4 w-4" />
                                    Reframe
                                </Button>
                            </>
                          )}
                          <Button onClick={() => onToggleFavorite(generatedMedia[viewingMediaIndex])} variant="secondary" className="w-full">
                            <Star className={cn("mr-2 h-4 w-4", generatedMedia[viewingMediaIndex].isFavorite && "fill-current text-yellow-400")} />
                            {generatedMedia[viewingMediaIndex].isFavorite ? 'Unfavorite' : 'Favorite'}
                          </Button>
                          <Button onClick={() => handleOpenVideoModal(generatedMedia[viewingMediaIndex])} variant="secondary" className="w-full" disabled={generatedMedia[viewingMediaIndex].type === 'video'}>
                             <Video className="mr-2 h-4 w-4" />
                             Create Video
                          </Button>
                          <Button onClick={() => handleDownloadMedia(generatedMedia[viewingMediaIndex])} variant="outline" className="w-full" disabled={isDownloading}>
                            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download
                          </Button>
                          <Button onClick={() => {
                            const indexToDelete = viewingMediaIndex;
                            setViewingMediaIndex(null);
                            setTimeout(() => handleDeleteMedia(indexToDelete), 150);
                          }} variant="destructive" className="w-full col-span-2">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                       </div>
                    </ViewerDialogFooter>
                </div>
             </div>
          </DialogContent>
        </Dialog>
      )}

      {mediaForVideoGen && (
        <VideoGenerationModal
            isOpen={isVideoModalOpen}
            onOpenChange={setIsVideoModalOpen}
            basePrompt={mediaForVideoGen.prompt}
            imageUrl={mediaForVideoGen.url}
            onStartGeneration={handleStartVideoGeneration}
        />
      )}

      <ImageModelSelectionModal 
        isOpen={isModelSelectionOpen}
        onOpenChange={setIsModelSelectionOpen}
        onSelectModel={handleStartImageGeneration}
        numberOfImages={numImagesToGenerate}
      />
    </div>
    </>
  );
};
