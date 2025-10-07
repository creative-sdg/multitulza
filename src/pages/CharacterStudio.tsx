import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageUploader } from '@/components/conjuring/ImageUploader';
import { CharacterProfileCard } from '@/components/conjuring/CharacterProfileCard';
import { GenerationModeSelector } from '@/components/conjuring/GenerationModeSelector';
import { StyleSelector } from '@/components/conjuring/StyleSelector';
import { SettingsModal } from '@/components/conjuring/SettingsModal';
import { HistorySidebar } from '@/components/conjuring/HistorySidebar';
import { PromptCard } from '@/components/conjuring/PromptCard';
import { GenerateAllModal } from '@/components/conjuring/GenerateAllModal';
import { ImageCropperModal } from '@/components/conjuring/ImageCropperModal';
import { VideoGenerationModal } from '@/components/conjuring/VideoGenerationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sparkles, Settings, Package, Loader2, RefreshCw, Video, Crop } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCharacterProfile, generateImagePrompts, hasGeminiApiKey } from '@/services/conjuring/geminiService';
import { hasFalApiKey, generateImageFal, generateVideoFal } from '@/services/conjuring/falService';
import { saveImage, getImage, saveGeneratedImage, getGeneratedImageUrl } from '@/services/conjuring/storageService';
import { getActivities, getAactivityCounts } from '@/services/conjuring/activityService';
import { saveHistoryItem, loadHistoryFromDatabase, deleteHistoryItem as deleteHistoryFromDatabase } from '@/services/conjuring/userService';
import type { CharacterProfile, GenerationMode, GenerationStyle, HistoryItem, ImagePrompt, ImageGenerationModel, VideoGenerationParams } from '@/types/conjuring';

const CharacterStudio: React.FC = () => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [imagePrompts, setImagePrompts] = useState<ImagePrompt[]>([]);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('normal');
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('ugc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentImageId, setCurrentImageId] = useState<string>('');
  const [isGenerateAllModalOpen, setIsGenerateAllModalOpen] = useState(false);
  const [generatingPromptIndices, setGeneratingPromptIndices] = useState<Set<number>>(new Set());
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoGenerationPromptIndex, setVideoGenerationPromptIndex] = useState<number | null>(null);
  const [generatingVideoIndices, setGeneratingVideoIndices] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  // Load history from database
  useEffect(() => {
    const loadHistory = async () => {
      const dbHistory = await loadHistoryFromDatabase();
      if (dbHistory.length > 0) {
        setHistory(dbHistory);
      } else {
        // Fallback to localStorage for migration
        const savedHistory = localStorage.getItem('conjuring-history');
        if (savedHistory) {
          try {
            const parsedHistory = JSON.parse(savedHistory);
            setHistory(parsedHistory);
            // Migrate to database
            for (const item of parsedHistory) {
              await saveHistoryItem(item);
            }
          } catch (e) {
            console.error('Failed to parse history:', e);
          }
        }
      }
    };
    loadHistory();
  }, []);

  const handleImageChange = (file: File) => {
    console.log('[CharacterStudio] Image selected:', file.name, file.type, file.size);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      console.log('[CharacterStudio] Image loaded as data URL, size:', dataUrl.length);
      
      // Save to IndexedDB
      const imageId = `char-${Date.now()}`;
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await saveImage(imageId, blob);
        setCurrentImageId(imageId);
      } catch (error) {
        console.error('[CharacterStudio] Failed to save image to IndexedDB:', error);
      }
      
      setImageUrl(dataUrl);
      setCharacterProfile(null);
      setImagePrompts([]);
    };
    reader.onerror = (error) => {
      console.error('[CharacterStudio] Error reading file:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить изображение",
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateCharacter = useCallback(async () => {
    console.log('[CharacterStudio] Starting character generation...');
    
    if (!imageUrl) {
      console.warn('[CharacterStudio] No image URL available');
      toast({
        title: "Ошибка",
        description: "Сначала загрузите изображение",
        variant: "destructive"
      });
      return;
    }

    if (!hasGeminiApiKey()) {
      console.warn('[CharacterStudio] Gemini API key not configured');
      toast({
        title: "API ключ не настроен",
        description: "Добавьте Gemini API ключ в настройках",
        variant: "destructive"
      });
      setSettingsOpen(true);
      return;
    }

    if (!hasFalApiKey()) {
      console.warn('[CharacterStudio] Fal.ai API key not configured');
      toast({
        title: "API ключ не настроен",
        description: "Добавьте Fal.ai API ключ в настройках",
        variant: "destructive"
      });
      setSettingsOpen(true);
      return;
    }

    setIsGenerating(true);
    
    try {
      console.log('[CharacterStudio] Extracting base64 from image URL...');
      const base64Image = imageUrl.split(',')[1];
      const mimeType = imageUrl.match(/data:(.*);base64,/)?.[1];
      
      if (!mimeType) {
        throw new Error("Could not determine image mime type");
      }
      
      console.log('[CharacterStudio] Image format:', mimeType);
      console.log('[CharacterStudio] Calling Gemini API to generate character profile...');
      
      const profile = await generateCharacterProfile(base64Image, mimeType);
      
      console.log('[CharacterStudio] Character profile generated:', profile);
      setCharacterProfile(profile);
      
      toast({
        title: "Успешно!",
        description: `Персонаж создан: ${profile.name}`,
      });

      console.log('[CharacterStudio] Generating image prompts...');
      const prompts = await generateImagePrompts(profile, generationMode, generationStyle);
      console.log('[CharacterStudio] Generated', prompts.length, 'image prompts');
      setImagePrompts(prompts);
      
      // Save to history
      const historyItem: HistoryItem = {
        id: currentImageId || `char-${Date.now()}`,
        timestamp: Date.now(),
        imageId: currentImageId,
        characterProfile: profile,
        imagePrompts: prompts,
        generationMode,
        generationStyle
      };
      
      const newHistory = [historyItem, ...history];
      setHistory(newHistory);
      
      // Save to database
      await saveHistoryItem(historyItem);
      
      toast({
        title: "Промпты готовы",
        description: `Создано ${prompts.length} промптов для генерации`,
      });

    } catch (error: any) {
      console.error('[CharacterStudio] Generation failed:', error);
      console.error('[CharacterStudio] Error stack:', error.stack);
      
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать персонажа",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
      console.log('[CharacterStudio] Generation process completed');
    }
  }, [imageUrl, generationMode, generationStyle, toast, currentImageId, history]);

  const handleRegenerateScenes = async () => {
    if (!characterProfile) return;
    
    setIsGeneratingScenes(true);
    try {
      const prompts = await generateImagePrompts(characterProfile, generationMode, generationStyle);
      setImagePrompts(prompts);
      
      toast({
        title: "Сцены обновлены",
        description: `Создано ${prompts.length} новых промптов`,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось сгенерировать сцены",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingScenes(false);
    }
  };

  const handleSelectHistoryItem = async (item: HistoryItem) => {
    try {
      const blob = await getImage(item.imageId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      }
      
      // Load generated images from IndexedDB
      const promptsWithImages = await Promise.all(
        item.imagePrompts.map(async (prompt) => {
          if (prompt.generatedImageUrl && prompt.generatedImageUrl.startsWith('generated_')) {
            // This is a stored image ID, load it from IndexedDB
            const url = await getGeneratedImageUrl(prompt.generatedImageUrl);
            return { ...prompt, generatedImageUrl: url || prompt.generatedImageUrl };
          }
          return prompt;
        })
      );
      
      setCharacterProfile(item.characterProfile);
      setImagePrompts(promptsWithImages);
      setCurrentImageId(item.imageId);
    } catch (error) {
      console.error('Failed to load history item:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить из истории",
        variant: "destructive"
      });
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await deleteHistoryFromDatabase(id);
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
  };

  const handlePromptChange = (index: number, newPrompt: string) => {
    const newPrompts = [...imagePrompts];
    newPrompts[index].prompt = newPrompt;
    setImagePrompts(newPrompts);
  };

  const handleReimagine = async (index: number, newActivity: string) => {
    // TODO: Implement reimagine logic
    console.log('Reimagine prompt', index, 'with activity:', newActivity);
  };

  const handleGenerateAllImages = async (model: ImageGenerationModel) => {
    if (!imageUrl || !characterProfile) return;
    
    setIsGenerateAllModalOpen(false);
    
    // Generate all images
    for (let i = 0; i < imagePrompts.length; i++) {
      setGeneratingPromptIndices(prev => new Set(prev).add(i));
      
      try {
        const base64Image = imageUrl.split(',')[1];
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const imageUrl_ = await generateImageFal(imagePrompts[i].prompt, blob, model, null);
        
        // Save generated image to IndexedDB
        const savedImageId = await saveGeneratedImage(imageUrl_);
        
        const newPrompts = [...imagePrompts];
        newPrompts[i].generatedImageUrl = savedImageId; // Store the ID instead of URL
        setImagePrompts(newPrompts);
        
        // Update history with generated image
        const historyItem = history.find(item => item.id === currentImageId || item.imageId === currentImageId);
        if (historyItem) {
          const updatedItem = {
            ...historyItem,
            imagePrompts: newPrompts
          };
          await saveHistoryItem(updatedItem);
          
          const updatedHistory = history.map(item => {
            if (item.id === currentImageId || item.imageId === currentImageId) {
              return updatedItem;
            }
            return item;
          });
          setHistory(updatedHistory);
        }
        
        toast({
          title: "Изображение готово",
          description: `Сцена "${imagePrompts[i].scene}" сгенерирована`,
        });
      } catch (error: any) {
        console.error(`Failed to generate image for prompt ${i}:`, error);
        const newPrompts = [...imagePrompts];
        newPrompts[i].generationError = error.message;
        setImagePrompts(newPrompts);
        
        // Update history even with error
        const historyItem = history.find(item => item.id === currentImageId || item.imageId === currentImageId);
        if (historyItem) {
          const updatedItem = {
            ...historyItem,
            imagePrompts: newPrompts
          };
          await saveHistoryItem(updatedItem);
          
          const updatedHistory = history.map(item => {
            if (item.id === currentImageId || item.imageId === currentImageId) {
              return updatedItem;
            }
            return item;
          });
          setHistory(updatedHistory);
        }
      } finally {
        setGeneratingPromptIndices(prev => {
          const newSet = new Set(prev);
          newSet.delete(i);
          return newSet;
        });
      }
    }
  };

  const handleStartVideoGeneration = async (promptIndex: number, params: VideoGenerationParams) => {
    const promptItem = imagePrompts[promptIndex];
    if (!promptItem.generatedImageUrl) {
      toast({
        title: "Ошибка",
        description: "Сначала нужно сгенерировать изображение",
        variant: "destructive"
      });
      return;
    }

    setGeneratingVideoIndices(prev => new Set(prev).add(promptIndex));
    
    try {
      const videoUrl = await generateVideoFal({
        prompt: params.prompt,
        imageUrl: promptItem.generatedImageUrl,
        resolution: params.resolution,
        duration: params.duration,
        model: params.model,
        onProgress: (logs) => {
          console.log('Video generation progress:', logs);
        }
      });

      // Update prompt with generated video URL
      const newPrompts = [...imagePrompts];
      if (!newPrompts[promptIndex].generatedMedia) {
        newPrompts[promptIndex].generatedMedia = [];
      }
      newPrompts[promptIndex].generatedMedia?.push({
        prompt: params.prompt,
        url: videoUrl,
        type: 'video',
        model: params.model,
        resolution: params.resolution,
        duration: params.duration,
        scene: promptItem.scene
      });
      setImagePrompts(newPrompts);

      // Update history
      const historyItem = history.find(item => item.id === currentImageId || item.imageId === currentImageId);
      if (historyItem) {
        const updatedItem = {
          ...historyItem,
          imagePrompts: newPrompts
        };
        await saveHistoryItem(updatedItem);
        
        const updatedHistory = history.map(item => {
          if (item.id === currentImageId || item.imageId === currentImageId) {
            return updatedItem;
          }
          return item;
        });
        setHistory(updatedHistory);
      }

      toast({
        title: "Видео готово",
        description: `Видео для сцены "${promptItem.scene}" сгенерировано`,
      });
    } catch (error: any) {
      console.error(`Failed to generate video for prompt ${promptIndex}:`, error);
      toast({
        title: "Ошибка генерации видео",
        description: error.message || "Не удалось сгенерировать видео",
        variant: "destructive"
      });
    } finally {
      setGeneratingVideoIndices(prev => {
        const newSet = new Set(prev);
        newSet.delete(promptIndex);
        return newSet;
      });
    }
  };

  const handleGenerateAllVideos = () => {
    // Check if all images are generated
    const allImagesGenerated = imagePrompts.every(p => p.generatedImageUrl);
    if (!allImagesGenerated) {
      toast({
        title: "Ошибка",
        description: "Сначала нужно сгенерировать все изображения",
        variant: "destructive"
      });
      return;
    }

    // Open video modal for the first prompt (can be expanded to batch process)
    setVideoGenerationPromptIndex(0);
    setIsVideoModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative text-center space-y-4 mb-12">
          <div className="absolute left-0 top-0">
            <HistorySidebar
              history={history}
              onSelectItem={handleSelectHistoryItem}
              onDeleteItem={handleDeleteHistoryItem}
            />
          </div>
          <div className="absolute right-0 top-0 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setAssetsOpen(true)}
              aria-label="Assets Library"
            >
              <Package className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="text-4xl font-bold">Conjuring Studio</h1>
          <p className="text-zinc-400">
            Генерируйте персонажей с AI: профиль, сцены, изображения и видео
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Загрузите изображение персонажа</h2>
            <ImageUploader imageUrl={imageUrl} onImageChange={handleImageChange} />
            {imageUrl && (
              <div className="mt-4 flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCropperOpen(true)}
                  className="gap-2"
                >
                  <Crop className="w-4 h-4" />
                  Crop / Reframe Image
                </Button>
              </div>
            )}
          </div>

          {characterProfile && (
            <CharacterProfileCard 
              profile={characterProfile} 
              onEdit={() => {}} 
            />
          )}
        </div>

        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-3">Стиль генерации</h3>
            <StyleSelector 
              selectedStyle={generationStyle} 
              onStyleChange={setGenerationStyle} 
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Режим генерации</h3>
            <GenerationModeSelector 
              selectedMode={generationMode} 
              onModeChange={setGenerationMode} 
            />
          </div>
        </div>

        {!characterProfile ? (
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-8 text-center">
              <p className="text-zinc-400 mb-4">
                {!imageUrl 
                  ? "Загрузите изображение для начала" 
                  : !hasGeminiApiKey() || !hasFalApiKey()
                  ? "Настройте API ключи в Settings"
                  : "Готово к генерации!"
                }
              </p>
              <Button 
                disabled={!imageUrl || isGenerating} 
                className="gap-2"
                onClick={handleGenerateCharacter}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Сгенерировать персонажа
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleGenerateCharacter}
                variant="secondary"
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Conjuring Personality
              </Button>
              <Button 
                onClick={handleRegenerateScenes}
                disabled={isGeneratingScenes}
                variant="secondary"
                className="gap-2"
              >
                {isGeneratingScenes ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Regenerate Scenes
                  </>
                )}
              </Button>
            </div>

            {imagePrompts.length > 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-4">Scene Prompts</h2>
                  <div className="flex gap-4 justify-center mb-6">
                    <Button 
                      onClick={() => setIsGenerateAllModalOpen(true)}
                      variant="destructive"
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate All Scene Images
                    </Button>
                    <Button 
                      variant="outline"
                      className="gap-2"
                      onClick={handleGenerateAllVideos}
                      disabled={!imagePrompts.every(p => p.generatedImageUrl)}
                    >
                      <Video className="w-4 h-4" />
                      Generate All Scene Videos
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {imagePrompts.map((promptItem, index) => (
                    <PromptCard
                      key={index}
                      scene={promptItem.scene}
                      prompt={promptItem.prompt}
                      index={index}
                      variations={promptItem.variations}
                       generatedImageUrl={promptItem.generatedImageUrl}
                      isGenerating={generatingPromptIndices.has(index)}
                      generationError={promptItem.generationError}
                      activityLists={getActivities()}
                      onPromptChange={handlePromptChange}
                      onReimagine={handleReimagine}
                      onGoToCreate={async () => {
                        // Load actual image URL if it's a stored ID
                        let imageUrl = promptItem.generatedImageUrl;
                        if (imageUrl && imageUrl.startsWith('generated_')) {
                          imageUrl = await getGeneratedImageUrl(imageUrl) || imageUrl;
                        }
                        navigate(`/creation/${currentImageId}/${index}`, { 
                          state: { imageUrl } 
                        });
                      }}
                      onGenerateVideo={() => {
                        setVideoGenerationPromptIndex(index);
                        setIsVideoModalOpen(true);
                      }}
                      isGeneratingVideo={generatingVideoIndices.has(index)}
                      generatedMedia={promptItem.generatedMedia}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        
        <ImageCropperModal 
          isOpen={isCropperOpen}
          onOpenChange={setIsCropperOpen}
          imageUrl={imageUrl}
          onCropComplete={async (croppedUrl) => {
            setImageUrl(croppedUrl);
            
            // Save cropped image to IndexedDB
            const imageId = currentImageId || `char-${Date.now()}`;
            try {
              const response = await fetch(croppedUrl);
              const blob = await response.blob();
              await saveImage(imageId, blob);
              setCurrentImageId(imageId);
            } catch (error) {
              console.error('Failed to save cropped image:', error);
            }
            
            setIsCropperOpen(false);
            toast({
              title: "Изображение обрезано",
              description: "Изображение успешно обрезано",
            });
          }}
          onCancel={() => setIsCropperOpen(false)}
          onAiReframeComplete={async (reframedUrl) => {
            setImageUrl(reframedUrl);
            
            // Save reframed image to IndexedDB
            const imageId = currentImageId || `char-${Date.now()}`;
            try {
              const response = await fetch(reframedUrl);
              const blob = await response.blob();
              await saveImage(imageId, blob);
              setCurrentImageId(imageId);
            } catch (error) {
              console.error('Failed to save reframed image:', error);
            }
            
            setIsCropperOpen(false);
            toast({
              title: "Изображение перекадрировано",
              description: "AI успешно перекадрировало изображение",
            });
          }}
        />
        
        <Sheet open={assetsOpen} onOpenChange={setAssetsOpen}>
          <SheetContent side="right" className="w-full max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-50">
            <SheetHeader>
              <SheetTitle>Assets Library</SheetTitle>
              <SheetDescription>
                Все сгенерированные медиа-файлы появятся здесь
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <p className="text-sm text-zinc-400 text-center py-8">
                Пока нет созданных ассетов. Начните генерировать!
              </p>
            </div>
          </SheetContent>
        </Sheet>

        <GenerateAllModal
          isOpen={isGenerateAllModalOpen}
          onOpenChange={setIsGenerateAllModalOpen}
          onSelectModel={handleGenerateAllImages}
        />

        {videoGenerationPromptIndex !== null && imagePrompts[videoGenerationPromptIndex] && (
          <VideoGenerationModal
            isOpen={isVideoModalOpen}
            onOpenChange={setIsVideoModalOpen}
            basePrompt={imagePrompts[videoGenerationPromptIndex].prompt}
            imageUrl={imagePrompts[videoGenerationPromptIndex].generatedImageUrl || ''}
            onStartGeneration={(params) => handleStartVideoGeneration(videoGenerationPromptIndex, params)}
          />
        )}
      </div>
    </div>
  );
};

export default CharacterStudio;
