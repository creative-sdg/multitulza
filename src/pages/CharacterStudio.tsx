import React, { useState, useCallback } from 'react';
import { ImageUploader } from '@/components/conjuring/ImageUploader';
import { CharacterProfileCard } from '@/components/conjuring/CharacterProfileCard';
import { GenerationModeSelector } from '@/components/conjuring/GenerationModeSelector';
import { StyleSelector } from '@/components/conjuring/StyleSelector';
import { SettingsModal } from '@/components/conjuring/SettingsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sparkles, Settings, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCharacterProfile, generateImagePrompts, hasGeminiApiKey } from '@/services/conjuring/geminiService';
import { hasFalApiKey } from '@/services/conjuring/falService';
import type { CharacterProfile, GenerationMode, GenerationStyle } from '@/types/conjuring';

const CharacterStudio: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('normal');
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('ugc');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleImageChange = (file: File) => {
    console.log('[CharacterStudio] Image selected:', file.name, file.type, file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      console.log('[CharacterStudio] Image loaded as data URL, size:', dataUrl.length);
      setImageUrl(dataUrl);
      setCharacterProfile(null);
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
  }, [imageUrl, generationMode, generationStyle, toast]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative text-center space-y-4 mb-12">
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
          <h1 className="text-4xl font-bold">Character Studio</h1>
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
      </div>
    </div>
  );
};

export default CharacterStudio;
