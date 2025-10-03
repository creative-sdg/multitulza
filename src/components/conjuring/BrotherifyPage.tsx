import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, WandSparkles, Download, Star, Video, Crop, UserPlus } from 'lucide-react';
import { hasFalApiKey, editImageFal } from '@/services/conjuring/falService';
import { generateEditSuggestion } from '@/services/conjuring/geminiService';
import { dataUrlToBlob } from '@/utils/conjuring/fileUtils';
import type { GeneratedMedia, VideoGenerationParams } from '@/types/conjuring';
import { Dialog, DialogContent, DialogFooter as ViewerDialogFooter } from '@/components/ui/dialog';
import { VideoGenerationModal } from './VideoGenerationModal';

interface ImageEditPageProps {
  sourceImageUrl: string;
  onBack: () => void;
  onImagesGenerated: (images: GeneratedMedia[]) => void;
  onSetAsSourceImage: (imageUrl: string) => void;
  onStartVideoGeneration: (params: VideoGenerationParams, sourceMedia: GeneratedMedia) => void;
  onStartReframe: (sourceMedia: GeneratedMedia) => void;
}

export const ImageEditPage: React.FC<ImageEditPageProps> = ({ sourceImageUrl, onBack, onImagesGenerated, onSetAsSourceImage, onStartVideoGeneration, onStartReframe }) => {
  const [prompt, setPrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<GeneratedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [viewingImage, setViewingImage] = useState<GeneratedMedia | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [mediaForVideoGen, setMediaForVideoGen] = useState<GeneratedMedia | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to describe the edit.');
      return;
    }
    if (!hasFalApiKey()) {
      setError("Fal.ai API key is not configured. Please add it in settings.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const imageBlob = await dataUrlToBlob(sourceImageUrl);
      const images = await editImageFal(prompt, imageBlob, 1);
      setGeneratedImages(prev => [...images, ...prev]);
      onImagesGenerated(images);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to generate images.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSuggestEdit = async () => {
      setIsSuggesting(true);
      setError(null);
      try {
          const base64Image = sourceImageUrl.split(',')[1];
          const mimeType = sourceImageUrl.match(/data:(.*);base64,/)?.[1];
          if (!mimeType) {
              throw new Error("Could not determine image mime type from data URL.");
          }
          const suggestion = await generateEditSuggestion(base64Image, mimeType);
          setPrompt(suggestion);
      } catch (e: any) {
          console.error("Failed to get suggestion:", e);
          setError(e.message || "Failed to get suggestion from AI.");
      } finally {
          setIsSuggesting(false);
      }
  };
  
  const handleDownload = async (media: GeneratedMedia) => {
    setIsDownloading(true);
    try {
        const response = await fetch(media.url);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        const fileName = `${media.prompt.substring(0, 30).replace(/[\W_]+/g, '_')}_${new Date().getTime()}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(objectUrl);
        a.remove();
    } catch (err) {
        console.error('Download failed:', err);
        setError('Download failed. Opening in a new tab.');
        window.open(media.url, '_blank');
    } finally {
        setIsDownloading(false);
    }
  };

  const handleOpenVideoModal = (media: GeneratedMedia) => {
    if (!hasFalApiKey()) {
      setError("Fal.ai API key is not set. Please add it in the settings before generating videos.");
      return;
    }
    setMediaForVideoGen(media);
    setIsVideoModalOpen(true);
    setViewingImage(null); // Close the image viewer
  };

  const handleStartVideoGeneration = (params: VideoGenerationParams) => {
    if (!mediaForVideoGen) return;
    onStartVideoGeneration(params, mediaForVideoGen);
    setIsVideoModalOpen(false);
  };


  return (
    <>
      <Button onClick={onBack} variant="ghost" className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2"/>
        Back to Main Studio
      </Button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="bg-zinc-950/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Edit Image with AI</CardTitle>
              <CardDescription>Edit your character using a text prompt with the Nano Banana model.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Source Image</Label>
                <img src={sourceImageUrl} alt="Source for editing" className="mt-1 rounded-lg w-full object-contain aspect-square bg-black" />
              </div>
              <div>
                <Label htmlFor="edit-prompt">Edit Prompt</Label>
                <Textarea
                  id="edit-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Change his eye color to hazel"
                  className="mt-1 h-24"
                />
                 <Button 
                    onClick={handleSuggestEdit}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    disabled={isSuggesting}
                >
                    {isSuggesting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Getting suggestion...
                        </>
                    ) : (
                        <>
                            <WandSparkles className="mr-2 h-4 w-4" />
                            Suggest an Edit
                        </>
                    )}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-stretch">
              <Button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <WandSparkles className="mr-2 h-5 w-5" />
                    Generate
                  </>
                )}
              </Button>
              {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-2">
           <h2 className="text-2xl font-bold text-white mb-4">Results</h2>
            {(isLoading && generatedImages.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400 p-8 border-2 border-dashed border-zinc-800 rounded-lg">
                    <WandSparkles className="mx-auto h-12 w-12 animate-pulse text-zinc-500" />
                    <p className="mt-4 text-lg font-semibold">Generating your edits...</p>
                </div>
            )}
            {(!isLoading && generatedImages.length === 0) && (
                <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 p-8 border-2 border-dashed border-zinc-800 rounded-lg">
                    <p>Your edited images will appear here.</p>
                </div>
            )}
            {generatedImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {generatedImages.map((media, index) => (
                        <div key={index} className="relative group aspect-[9/16] cursor-pointer" onClick={() => setViewingImage(media)}>
                           <img src={media.url} alt={`Generated image ${index + 1}`} className="w-full h-full object-cover rounded-md bg-zinc-900" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md p-2">
                               <p className="text-xs text-white text-center line-clamp-3">{media.prompt}</p>
                           </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {viewingImage && (
      <Dialog open={!!viewingImage} onOpenChange={(isOpen) => !isOpen && setViewingImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-zinc-950 border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-3 h-full overflow-hidden">
              <div className="md:col-span-2 flex items-center justify-center bg-black p-4">
                <img src={viewingImage.url} alt={viewingImage.prompt} className="max-w-full max-h-[80vh] object-contain"/>
              </div>
              <div className="md:col-span-1 bg-zinc-950 p-6 flex flex-col justify-between overflow-y-auto">
                  <div>
                      <h3 className="font-semibold text-lg text-zinc-100 mb-2">Details</h3>
                      <p className="text-sm text-zinc-400 mb-4 h-24 overflow-y-auto">{viewingImage.prompt}</p>
                      <div className="text-xs text-zinc-500 space-y-1">
                          {viewingImage.model && <p><strong>Model:</strong> {viewingImage.model}</p>}
                          {viewingImage.width && viewingImage.height && <p><strong>Dimensions:</strong> {viewingImage.width} x {viewingImage.height}</p>}
                          {viewingImage.size && <p><strong>Size:</strong> {(viewingImage.size / 1024 / 1024).toFixed(2)} MB</p>}
                          {viewingImage.seed && <p><strong>Seed:</strong> {viewingImage.seed}</p>}
                      </div>
                  </div>
                  <ViewerDialogFooter className="mt-6">
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleOpenVideoModal(viewingImage)} variant="secondary" className="w-full">
                            <Video className="mr-2 h-4 w-4" />
                            Create Video
                        </Button>
                        <Button onClick={() => {
                           if (viewingImage) onStartReframe(viewingImage);
                           setViewingImage(null);
                        }} variant="secondary" className="w-full">
                           <Crop className="mr-2 h-4 w-4" />
                           Reframe
                        </Button>
                        <Button onClick={() => {
                           onSetAsSourceImage(viewingImage.url);
                           setViewingImage(null);
                        }} variant="secondary" className="w-full">
                           <UserPlus className="mr-2 h-4 w-4" />
                           Set as Source
                        </Button>
                        <Button onClick={() => handleDownload(viewingImage)} variant="outline" className="w-full" disabled={isDownloading}>
                           {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                           Download
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
    </>
  );
};
