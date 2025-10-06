import React, { useState, useCallback, useEffect } from 'react';
import { ImageUploader } from '@/components/conjuring/ImageUploader';
import { CharacterProfileCard } from '@/components/conjuring/CharacterProfileCard';
import { GenerationModeSelector } from '@/components/conjuring/GenerationModeSelector';
import { StyleSelector } from '@/components/conjuring/StyleSelector';
import { SettingsModal } from '@/components/conjuring/SettingsModal';
import { HistorySidebar } from '@/components/conjuring/HistorySidebar';
import { PromptCard } from '@/components/conjuring/PromptCard';
import { GenerateAllModal } from '@/components/conjuring/GenerateAllModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sparkles, Settings, Package, Loader2, RefreshCw, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCharacterProfile, generateImagePrompts, hasGeminiApiKey } from '@/services/conjuring/geminiService';
import { hasFalApiKey, generateImageFal } from '@/services/conjuring/falService';
import { saveImage, getImage } from '@/services/conjuring/storageService';
import { getActivities, getAactivityCounts } from '@/services/conjuring/activityService';
import type { CharacterProfile, GenerationMode, GenerationStyle, HistoryItem, ImagePrompt, ImageGenerationModel } from '@/types/conjuring';

const CharacterStudio: React.FC = () => {
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
  const { toast } = useToast();

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('conjuring-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history:', e);
      }
    }
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
        imagePrompts: prompts
      };
      
      const newHistory = [historyItem, ...history];
      setHistory(newHistory);
      localStorage.setItem('conjuring-history', JSON.stringify(newHistory));
      
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
      setCharacterProfile(item.characterProfile);
      setImagePrompts(item.imagePrompts);
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

  const handleDeleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('conjuring-history', JSON.stringify(newHistory));
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
        
        const newPrompts = [...imagePrompts];
        newPrompts[i].generatedImageUrl = imageUrl_;
        setImagePrompts(newPrompts);
        
        toast({
          title: "Изображение готово",
          description: `Сцена "${imagePrompts[i].scene}" сгенерирована`,
        });
      } catch (error: any) {
        console.error(`Failed to generate image for prompt ${i}:`, error);
        const newPrompts = [...imagePrompts];
        newPrompts[i].generationError = error.message;
        setImagePrompts(newPrompts);
      } finally {
        setGeneratingPromptIndices(prev => {
          const newSet = new Set(prev);
          newSet.delete(i);
          return newSet;
        });
      }
    }
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
                      disabled
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
                      onGoToCreate={() => {
                        toast({
                          title: "Info",
                          description: "Creation page coming soon",
                        });
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
        
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
      </div>
    </div>
  );
};

export default CharacterStudio;
