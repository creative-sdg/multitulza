import React, { useState } from 'react';
import { ImageUploader } from '@/components/conjuring/ImageUploader';
import { CharacterProfileCard } from '@/components/conjuring/CharacterProfileCard';
import { GenerationModeSelector } from '@/components/conjuring/GenerationModeSelector';
import { StyleSelector } from '@/components/conjuring/StyleSelector';
import { SettingsModal } from '@/components/conjuring/SettingsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Settings } from 'lucide-react';
import type { CharacterProfile, GenerationMode, GenerationStyle } from '@/types/conjuring';

const CharacterStudio: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [characterProfile, setCharacterProfile] = useState<CharacterProfile | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('normal');
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>('ugc');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleImageChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative text-center space-y-4 mb-12">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="absolute right-0 top-0"
          >
            <Settings className="h-5 w-5" />
          </Button>
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
              Загрузите изображение и настройте параметры для генерации
            </p>
            <Button disabled={!imageUrl} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Сгенерировать персонажа
            </Button>
          </CardContent>
        </Card>

        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </div>
  );
};

export default CharacterStudio;
