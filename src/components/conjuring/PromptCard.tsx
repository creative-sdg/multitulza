import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Edit, X, WandSparkles, Copy, Check, FilePenLine, Loader2, RefreshCw, Video } from 'lucide-react';
import type { ActivityLists, GeneratedMedia } from '@/types/conjuring';
import { ReimagineModal } from './ReimagineModal';
import { getGeneratedImageUrl } from '@/services/conjuring/storageService';

interface PromptCardProps {
  scene: string;
  prompt: string;
  index: number;
  variations?: string[];
  generatedImageUrl?: string;
  isGenerating?: boolean;
  isReimagining?: boolean;
  isGeneratingVideo?: boolean;
  generationError?: string;
  activityLists: ActivityLists;
  generatedMedia?: GeneratedMedia[];
  onPromptChange: (index: number, newPrompt: string) => void;
  onReimagine: (index: number, newActivity: string) => void;
  onGoToCreate: () => void;
  onGenerateVideo?: () => void;
}

export const PromptCard: React.FC<PromptCardProps> = ({ scene, prompt, index, variations, generatedImageUrl, onPromptChange, onGoToCreate, isGenerating, isReimagining, isGeneratingVideo, generationError, activityLists, onReimagine, onGenerateVideo, generatedMedia }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [isReimagineOpen, setIsReimagineOpen] = useState(false);
  const [displayMediaUrl, setDisplayMediaUrl] = useState<string | null>(null);
  const [displayMediaType, setDisplayMediaType] = useState<'image' | 'video'>('image');

  // Load media URL (prefer video over image)
  useEffect(() => {
    const loadMedia = async () => {
      // First check for video in generatedMedia
      if (generatedMedia && generatedMedia.length > 0) {
        const firstVideo = generatedMedia.find(media => media.type === 'video');
        if (firstVideo) {
          // Check if it's a stored ID or direct URL
          if (firstVideo.url.startsWith('generated_')) {
            const url = await getGeneratedImageUrl(firstVideo.url);
            setDisplayMediaUrl(url);
          } else {
            setDisplayMediaUrl(firstVideo.url);
          }
          setDisplayMediaType('video');
          return;
        }
        
        // If no video, check for image in generatedMedia
        const firstImage = generatedMedia.find(media => media.type === 'image');
        if (firstImage) {
          if (firstImage.url.startsWith('generated_')) {
            const url = await getGeneratedImageUrl(firstImage.url);
            setDisplayMediaUrl(url);
          } else {
            setDisplayMediaUrl(firstImage.url);
          }
          setDisplayMediaType('image');
          return;
        }
      }
      
      // Fallback to generatedImageUrl
      if (generatedImageUrl) {
        if (generatedImageUrl.startsWith('generated_')) {
          const url = await getGeneratedImageUrl(generatedImageUrl);
          setDisplayMediaUrl(url);
        } else {
          setDisplayMediaUrl(generatedImageUrl);
        }
        setDisplayMediaType('image');
      } else {
        setDisplayMediaUrl(null);
      }
    };
    
    loadMedia();
  }, [generatedImageUrl, generatedMedia]);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onPromptChange(index, editedPrompt);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditedPrompt(prompt);
    setIsEditing(false);
  };

  const hasVariations = variations && variations.length > 0;

  return (
    <>
    <Card className="bg-zinc-900 border-zinc-800 flex flex-row min-h-[280px] hover:border-zinc-700 transition-colors duration-300 relative overflow-hidden">
      {(isGenerating || isReimagining || isGeneratingVideo) && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-300">
                {isGeneratingVideo ? 'Generating video...' : isReimagining ? 'Reimagining...' : 'Generating...'}
              </p>
          </div>
      )}
      
      <div className="flex-grow flex flex-col p-6 min-w-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-200">{scene}</h3>
        </div>
        <div className="flex-grow">
          {isEditing ? (
              <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="h-24 min-h-0 resize-none"
              aria-label={`Edit prompt for ${scene}`}
              />
          ) : (
              <p className="text-zinc-300 text-sm h-24 overflow-y-auto">{prompt}</p>
          )}
          {generationError && (
              <p className="mt-2 text-sm text-red-400">Error: {generationError}</p>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="ghost" size="sm" className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
              </Button>
              <Button onClick={handleSave} variant="secondary" size="sm" className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Save
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onGoToCreate} variant={hasVariations || displayMediaUrl ? 'default' : 'destructive'} size="sm" aria-label={hasVariations ? "View variations" : "Create with this prompt"}>
                  <WandSparkles className="w-4 h-4 mr-2" />
                  {hasVariations || displayMediaUrl ? 'Variations' : 'Create'}
              </Button>
              {displayMediaUrl && displayMediaType === 'image' && onGenerateVideo && (
                <Button 
                  onClick={onGenerateVideo} 
                  variant="default" 
                  size="sm" 
                  aria-label="Generate video from image"
                  disabled={isGeneratingVideo}
                >
                  <Video className="w-4 h-4 mr-2" />
                  Video
                </Button>
              )}
              <div className="flex-grow" />
              <Button onClick={() => setIsReimagineOpen(true)} variant="outline" size="icon" aria-label="Reimagine prompt" className="flex-shrink-0">
                  <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="icon" aria-label="Edit prompt" className="flex-shrink-0">
                  <FilePenLine className="w-4 h-4" />
              </Button>
              <Button onClick={handleCopy} variant="outline" size="icon" aria-label="Copy prompt" className="flex-shrink-0">
                {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                ) : (
                    <Copy className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {displayMediaUrl && (
          <div className="w-48 flex-shrink-0 cursor-pointer overflow-hidden rounded-r-lg ml-4" onClick={onGoToCreate}>
              {displayMediaType === 'video' ? (
                <video src={displayMediaUrl} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={displayMediaUrl} alt={`Generated art for ${scene}`} className="h-full w-full object-cover" />
              )}
          </div>
      )}
    </Card>
    <ReimagineModal
      isOpen={isReimagineOpen}
      onOpenChange={setIsReimagineOpen}
      activityLists={activityLists}
      onSelectActivity={(activity: string) => onReimagine(index, activity)}
    />
    </>
  );
};
