import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Download, Zap, Video, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface VideoVariant {
  id: string;
  name: string;
  size: string;
  ending: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number;
  url?: string;
  thumbnail?: string;
}

const VideoGenerator = () => {
  const [sourceVideo, setSourceVideo] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  const videoSizes = [
    { id: 'square', name: '1:1 Square', dimensions: '1080x1080' },
    { id: 'vertical', name: '9:16 Vertical', dimensions: '1080x1920' },
    { id: 'horizontal', name: '16:9 Horizontal', dimensions: '1920x1080' }
  ];

  const endings = [
    { id: 'cta1', name: 'Концовка A', description: 'Call-to-action вариант 1' },
    { id: 'cta2', name: 'Концовка B', description: 'Call-to-action вариант 2' }
  ];

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSourceVideo(file);
      toast.success('Видео загружено успешно!');
    }
  };

  const generateVariants = async () => {
    if (!sourceVideo) {
      toast.error('Сначала загрузите исходное видео');
      return;
    }

    setIsGenerating(true);
    setOverallProgress(0);

    // Create all 6 combinations
    const newVariants: VideoVariant[] = [];
    videoSizes.forEach(size => {
      endings.forEach(ending => {
        newVariants.push({
          id: `${size.id}_${ending.id}`,
          name: `${size.name} - ${ending.name}`,
          size: size.dimensions,
          ending: ending.description,
          status: 'pending',
          progress: 0
        });
      });
    });

    setVariants(newVariants);

    // Simulate generation process
    for (let i = 0; i < newVariants.length; i++) {
      const variant = newVariants[i];
      
      // Update variant status to generating
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'generating' } : v
      ));

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setVariants(prev => prev.map(v => 
          v.id === variant.id ? { ...v, progress } : v
        ));
      }

      // Mark as completed
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { 
          ...v, 
          status: 'completed',
          url: `https://example.com/video_${variant.id}.mp4`,
          thumbnail: `https://example.com/thumb_${variant.id}.jpg`
        } : v
      ));

      setOverallProgress(((i + 1) / newVariants.length) * 100);
    }

    setIsGenerating(false);
    toast.success('Все варианты видео готовы!');
  };

  const downloadVariant = (variant: VideoVariant) => {
    if (variant.url) {
      // Simulate download
      toast.success(`Скачивание ${variant.name} начато`);
    }
  };

  const getStatusColor = (status: VideoVariant['status']) => {
    switch (status) {
      case 'pending': return 'bg-muted';
      case 'generating': return 'bg-info';
      case 'completed': return 'bg-success';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Video className="h-8 w-8 text-video-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-video-primary to-video-secondary bg-clip-text text-transparent">
              Генератор Видео Вариаций
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Загрузите одно видео и получите 6 оптимизированных вариантов: 2 концовки × 3 размера
          </p>
        </div>

        {/* Upload Section */}
        <Card className="p-8 bg-video-surface border-video-primary/20">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="h-6 w-6 text-video-primary" />
              <h2 className="text-2xl font-semibold">Исходное видео</h2>
            </div>
            
            <div className="border-2 border-dashed border-video-primary/30 rounded-lg p-8 text-center hover:border-video-primary/50 transition-colors">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload"
              />
              <label htmlFor="video-upload" className="cursor-pointer space-y-4 block">
                <div className="flex justify-center">
                  <div className="p-4 bg-video-primary/10 rounded-full">
                    <Upload className="h-8 w-8 text-video-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {sourceVideo ? sourceVideo.name : 'Загрузите видео файл'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Поддерживаемые форматы: MP4, MOV, AVI
                  </p>
                </div>
              </label>
            </div>

            {sourceVideo && (
              <div className="flex items-center gap-4 p-4 bg-video-surface-elevated rounded-lg">
                <Play className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">{sourceVideo.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Размер: {(sourceVideo.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Generation Section */}
        <Card className="p-8 bg-video-surface border-video-primary/20">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-video-primary" />
              <h2 className="text-2xl font-semibold">Параметры генерации</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Размеры видео</h3>
                {videoSizes.map(size => (
                  <div key={size.id} className="flex items-center gap-3 p-3 bg-video-surface-elevated rounded-lg">
                    <div className="w-2 h-2 bg-video-primary rounded-full"></div>
                    <div>
                      <p className="font-medium">{size.name}</p>
                      <p className="text-sm text-muted-foreground">{size.dimensions}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-lg">Варианты концовки</h3>
                {endings.map(ending => (
                  <div key={ending.id} className="flex items-center gap-3 p-3 bg-video-surface-elevated rounded-lg">
                    <div className="w-2 h-2 bg-video-secondary rounded-full"></div>
                    <div>
                      <p className="font-medium">{ending.name}</p>
                      <p className="text-sm text-muted-foreground">{ending.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={generateVariants}
              disabled={!sourceVideo || isGenerating}
              className="w-full py-6 text-lg bg-gradient-to-r from-video-primary to-video-secondary hover:opacity-90 transition-opacity"
            >
              <Zap className="h-5 w-5 mr-2" />
              {isGenerating ? 'Генерирую варианты...' : 'Создать 6 вариантов'}
            </Button>
          </div>
        </Card>

        {/* Progress Section */}
        {isGenerating && (
          <Card className="p-6 bg-video-surface border-info/20">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-info animate-pulse" />
                <h3 className="font-medium">Прогресс генерации</h3>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {Math.round(overallProgress)}% завершено
              </p>
            </div>
          </Card>
        )}

        {/* Results Section */}
        {variants.length > 0 && (
          <Card className="p-8 bg-video-surface border-video-primary/20">
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Video className="h-6 w-6 text-video-primary" />
                <h2 className="text-2xl font-semibold">Результаты</h2>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {variants.map(variant => (
                  <Card key={variant.id} className="p-4 bg-video-surface-elevated border-border/50">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{variant.name}</h3>
                        <Badge className={`${getStatusColor(variant.status)} text-white border-0`}>
                          {variant.status === 'pending' && 'Ожидание'}
                          {variant.status === 'generating' && 'Создание'}
                          {variant.status === 'completed' && 'Готово'}
                          {variant.status === 'error' && 'Ошибка'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Размер: {variant.size}</p>
                        <p>{variant.ending}</p>
                      </div>

                      {variant.status === 'generating' && (
                        <div className="space-y-2">
                          <Progress value={variant.progress} className="h-1" />
                          <p className="text-xs text-muted-foreground">
                            {variant.progress}%
                          </p>
                        </div>
                      )}

                      {variant.status === 'completed' && (
                        <Button 
                          onClick={() => downloadVariant(variant)}
                          className="w-full bg-success hover:bg-success/90"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Скачать
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;