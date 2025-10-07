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
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);

  // Load image URL if it's stored as an ID in IndexedDB
  useEffect(() => {
    const loadImage = async () => {
      console.log('[PromptCard] Loading image, generatedImageUrl:', generatedImageUrl);
      if (generatedImageUrl) {
        if (generatedImageUrl.startsWith('generated_')) {
          // This is a stored image ID, load from IndexedDB
          console.log('[PromptCard] Loading from IndexedDB with ID:', generatedImageUrl);
          const url = await getGeneratedImageUrl(generatedImageUrl);
          console.log('[PromptCard] Loaded URL from IndexedDB:', url ? 'success' : 'failed');
          setDisplayImageUrl(url);
        } else {
          // This is already a URL
          console.log('[PromptCard] Using direct URL');
          setDisplayImageUrl(generatedImageUrl);
        }
      } else {
        setDisplayImageUrl(null);
      }
    };
    
    loadImage();
  }, [generatedImageUrl]);

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
    <Card className="bg-zinc-900 border-zinc-800 flex h-full hover:border-zinc-700 transition-colors duration-300 relative overflow-hidden">
      {(isGenerating || isReimagining || isGeneratingVideo) && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center z-10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              <p className="mt-2 text-sm text-zinc-300">
                {isGeneratingVideo ? 'Generating video...' : isReimagining ? 'Reimagining...' : 'Generating...'}
              </p>
          </div>
      )}
      
      <div className="flex-grow flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-200">{scene}</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between">
          <div>
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
                <Button onClick={onGoToCreate} variant={hasVariations || displayImageUrl ? 'default' : 'destructive'} size="sm" aria-label={hasVariations ? "View variations" : "Create with this prompt"}>
                    <WandSparkles className="w-4 h-4 mr-2" />
                    {hasVariations || displayImageUrl ? 'Variations' : 'Create'}
                </Button>
                {displayImageUrl && onGenerateVideo && (
                  <Button 
                    onClick={onGenerateVideo} 
                    variant="secondary" 
                    size="sm" 
                    aria-label="Generate video from image"
                    disabled={isGeneratingVideo}
                  >
                    <Video className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                )}
                <div className="flex-grow" />
                <Button onClick={() => setIsReimagineOpen(true)} variant="outline" size="icon" aria-label="Reimagine prompt">
                    <RefreshCw className="w-4 h-4" />
                </Button>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="icon" aria-label="Edit prompt">
                    <FilePenLine className="w-4 h-4" />
                </Button>
                <Button onClick={handleCopy} variant="outline" size="icon" aria-label="Copy prompt">
                  {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                  ) : (
                      <Copy className="w-4 h-4" />
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </div>

      {displayImageUrl && (
          <div className="w-32 flex-shrink-0 cursor-pointer" onClick={onGoToCreate}>
              <img src={displayImageUrl} alt={`Generated art for ${scene}`} className="h-full w-full object-cover" />
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
