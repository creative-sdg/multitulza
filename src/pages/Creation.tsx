import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CreationPage as CreationPageComponent } from '@/components/conjuring/CreationPage';
import { getImage } from '@/services/conjuring/storageService';
import { generateImageFal, editImageFal } from '@/services/conjuring/falService';
import { useToast } from '@/hooks/use-toast';
import { loadHistoryFromDatabase, saveHistoryItem } from '@/services/conjuring/userService';
import type { HistoryItem, ImageGenerationModel, VideoGenerationParams, GeneratedMedia } from '@/types/conjuring';

const Creation: React.FC = () => {
  const { characterId, promptIndex } = useParams<{ characterId: string; promptIndex: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [historyItem, setHistoryItem] = useState<HistoryItem | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [companionImageUrl, setCompanionImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [imageGenerationJobs, setImageGenerationJobs] = useState<Map<string, { prompt: string; error?: string; characterId: string; promptIndex: number }>>(new Map());
  const [videoGenerationJob, setVideoGenerationJob] = useState<{ imageUrl: string; logs: any[]; error?: string; characterId: string; promptIndex: number } | null>(null);

  useEffect(() => {
    const loadHistoryItem = async () => {
      if (!characterId || !promptIndex) {
        toast({
          title: "Ошибка",
          description: "Неверные параметры",
          variant: "destructive"
        });
        navigate('/character-studio');
        return;
      }

      try {
        // Load from database
        const history: HistoryItem[] = await loadHistoryFromDatabase();
        
        if (!history || history.length === 0) {
          throw new Error('История не найдена');
        }

        const item = history.find(h => h.id === characterId);
        
        if (!item) {
          throw new Error('Персонаж не найден');
        }

        setHistoryItem(item);

        // Load original image
        const imageBlob = await getImage(item.imageId);
        if (imageBlob) {
          setOriginalImageUrl(URL.createObjectURL(imageBlob));
        }

        // Load companion image if exists
        if (item.companionImageId) {
          const companionBlob = await getImage(item.companionImageId);
          if (companionBlob) {
            setCompanionImageUrl(URL.createObjectURL(companionBlob));
          }
        }

        setIsLoading(false);
      } catch (error: any) {
        console.error('Failed to load history item:', error);
        toast({
          title: "Ошибка загрузки",
          description: error.message || "Не удалось загрузить данные",
          variant: "destructive"
        });
        navigate('/character-studio');
      }
    };

    loadHistoryItem();
  }, [characterId, promptIndex, navigate, toast]);

  const handleVariationsGenerated = async (variations: string[]) => {
    if (!historyItem || !characterId || promptIndex === undefined) return;
    
    const pIndex = parseInt(promptIndex);
    const updatedItem = { ...historyItem };
    updatedItem.imagePrompts[pIndex].variations = variations;
    
    // Save to database
    await saveHistoryItem(updatedItem);
    setHistoryItem(updatedItem);
  };

  const handleGeneratedMediaUpdate = async (media: GeneratedMedia[]) => {
    if (!historyItem || !characterId || promptIndex === undefined) return;
    
    const pIndex = parseInt(promptIndex);
    const updatedItem = { ...historyItem };
    updatedItem.imagePrompts[pIndex].generatedMedia = media;
    
    // Save to database
    await saveHistoryItem(updatedItem);
    setHistoryItem(updatedItem);
  };

  const handleImageGenerated = async (imageUrl: string) => {
    if (!historyItem || !characterId || promptIndex === undefined) return;
    
    const pIndex = parseInt(promptIndex);
    const updatedItem = { ...historyItem };
    updatedItem.imagePrompts[pIndex].generatedImageUrl = imageUrl;
    
    // Save to database
    await saveHistoryItem(updatedItem);
    setHistoryItem(updatedItem);
    
    toast({
      title: "Изображение установлено",
      description: "Главное изображение сцены обновлено",
    });
  };

  const handleStartImageGeneration = async (
    prompts: string[], 
    model: ImageGenerationModel, 
    charId: string, 
    baseImageUrl: string, 
    compImageUrl: string | null
  ) => {
    const pIndex = parseInt(promptIndex!);
    
    for (const prompt of prompts) {
      const jobId = `${charId}-${pIndex}-${Date.now()}-${Math.random()}`;
      
      setImageGenerationJobs(prev => new Map(prev).set(jobId, {
        prompt,
        characterId: charId,
        promptIndex: pIndex
      }));

      try {
        const baseResponse = await fetch(baseImageUrl);
        const baseBlob = await baseResponse.blob();
        
        let companionBlob: Blob | null = null;
        if (compImageUrl) {
          const compResponse = await fetch(compImageUrl);
          companionBlob = await compResponse.blob();
        }

        let generatedUrl: string;
        
        if (model === 'nano-banana') {
          generatedUrl = await generateImageFal(prompt, baseBlob, model, companionBlob);
        } else {
          // For seedream, use editImageFal which generates multiple images
          const mediaList = await editImageFal(prompt, baseBlob, 1);
          generatedUrl = mediaList[0].url;
        }

        const newMedia: GeneratedMedia = {
          prompt,
          url: generatedUrl,
          type: 'image',
          model,
          scene: historyItem?.imagePrompts[pIndex]?.scene || 'Generated'
        };

        const currentMedia = historyItem?.imagePrompts[pIndex]?.generatedMedia || [];
        handleGeneratedMediaUpdate([...currentMedia, newMedia]);

        setImageGenerationJobs(prev => {
          const newMap = new Map(prev);
          newMap.delete(jobId);
          return newMap;
        });

        toast({
          title: "Изображение готово",
          description: `Сгенерировано с ${model}`,
        });
      } catch (error: any) {
        console.error('Image generation failed:', error);
        
        setImageGenerationJobs(prev => new Map(prev).set(jobId, {
          prompt,
          error: error.message,
          characterId: charId,
          promptIndex: pIndex
        }));
      }
    }
  };

  const handleStartVideoGeneration = async (
    params: VideoGenerationParams,
    charId: string,
    pIndex: number,
    sourceMedia: GeneratedMedia
  ) => {
    toast({
      title: "Видео генерация",
      description: "Эта функция в разработке",
    });
  };

  const handleCancelImageJob = (jobId: string) => {
    setImageGenerationJobs(prev => {
      const newMap = new Map(prev);
      newMap.delete(jobId);
      return newMap;
    });
  };

  const handleCancelVideoJob = () => {
    setVideoGenerationJob(null);
  };

  const handleOpenSettings = () => {
    navigate('/character-studio');
  };

  const handleStartReframe = (media: GeneratedMedia) => {
    toast({
      title: "Reframe",
      description: "Эта функция в разработке",
    });
  };

  const handleToggleFavorite = (media: GeneratedMedia) => {
    if (!historyItem || promptIndex === undefined) return;
    
    const pIndex = parseInt(promptIndex);
    const currentMedia = historyItem.imagePrompts[pIndex]?.generatedMedia || [];
    const updatedMedia = currentMedia.map(m => 
      m.url === media.url ? { ...m, isFavorite: !m.isFavorite } : m
    );
    
    handleGeneratedMediaUpdate(updatedMedia);
  };

  if (isLoading || !historyItem || promptIndex === undefined) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-400">Загрузка...</p>
      </div>
    );
  }

  const pIndex = parseInt(promptIndex);
  const promptData = historyItem.imagePrompts[pIndex];

  if (!promptData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-red-400">Промпт не найден</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate('/character-studio')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к Character Studio
        </Button>

        <CreationPageComponent
          characterId={characterId!}
          promptIndex={pIndex}
          characterName={historyItem.characterProfile.name}
          scene={promptData.scene}
          prompt={promptData.prompt}
          initialVariations={promptData.variations || []}
          generatedMedia={promptData.generatedMedia || []}
          originalImageUrl={originalImageUrl}
          companionImageUrl={companionImageUrl}
          onVariationsGenerated={handleVariationsGenerated}
          onGeneratedMediaUpdate={handleGeneratedMediaUpdate}
          onImageGenerated={handleImageGenerated}
          onOpenSettings={handleOpenSettings}
          onStartReframe={handleStartReframe}
          onToggleFavorite={handleToggleFavorite}
          imageGenerationJobs={imageGenerationJobs}
          videoGenerationJob={videoGenerationJob}
          onStartImageGeneration={handleStartImageGeneration}
          onStartVideoGeneration={handleStartVideoGeneration}
          onCancelImageJob={handleCancelImageJob}
          onCancelVideoJob={handleCancelVideoJob}
        />
      </div>
    </div>
  );
};

export default Creation;
