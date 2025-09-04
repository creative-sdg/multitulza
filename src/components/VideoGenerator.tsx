import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Play, Download, Zap, Video, Settings, Key } from 'lucide-react';
import { toast } from 'sonner';
import { CreatomateService, CREATOMATE_TEMPLATES, AVAILABLE_BRANDS } from '@/services/creatomateService';

interface VideoVariant {
  id: string;
  name: string;
  brand: string;
  size: string;
  dimensions: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number;
  url?: string;
}

interface BrandPackshots {
  [brandId: string]: {
    vertical?: File;
    square?: File;
    horizontal?: File;
  };
}

const VideoGenerator = () => {
  const [sourceVideo, setSourceVideo] = useState<File | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandPackshots, setBrandPackshots] = useState<BrandPackshots>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [creatomateService, setCreatomateService] = useState<CreatomateService | null>(null);

  const handlePackshotUpload = (brandId: string, size: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBrandPackshots(prev => ({
        ...prev,
        [brandId]: {
          ...prev[brandId],
          [size]: file
        }
      }));
      toast.success(`Пакшот ${size} для ${AVAILABLE_BRANDS.find(b => b.id === brandId)?.name} загружен!`);
    }
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

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

    if (selectedBrands.length === 0) {
      toast.error('Выберите хотя бы один бренд');
      return;
    }

    if (!apiKey.trim()) {
      toast.error('Введите API ключ Creatomate');
      return;
    }

    // Проверяем что у каждого выбранного бренда есть все пакшоты
    for (const brandId of selectedBrands) {
      const brandName = AVAILABLE_BRANDS.find(b => b.id === brandId)?.name;
      const packshots = brandPackshots[brandId];
      if (!packshots?.vertical || !packshots?.square || !packshots?.horizontal) {
        toast.error(`Загрузите все пакшоты для ${brandName}`);
        return;
      }
    }

    const service = new CreatomateService(apiKey);
    setCreatomateService(service);
    setIsGenerating(true);
    setOverallProgress(0);

    // Создаем варианты для каждого бренда и размера
    const newVariants: VideoVariant[] = [];
    selectedBrands.forEach(brandId => {
      const brandName = AVAILABLE_BRANDS.find(b => b.id === brandId)?.name || brandId;
      CREATOMATE_TEMPLATES.forEach(template => {
        newVariants.push({
          id: `${brandId}-${template.id}`,
          name: `${brandName} ${template.name}`,
          brand: brandName,
          size: template.size,
          dimensions: template.dimensions,
          status: 'pending' as const,
          progress: 0
        });
      });
    });

    setVariants(newVariants);

    // Process each variant
    const renderPromises = newVariants.map(variant => {
      const brandId = selectedBrands.find(id => {
        const brandName = AVAILABLE_BRANDS.find(b => b.id === id)?.name;
        return variant.brand === brandName;
      });
      const template = CREATOMATE_TEMPLATES.find(t => variant.size === t.size);
      const packshots = brandPackshots[brandId!];
      
      let packshotFile: File;
      if (template?.size === 'vertical') packshotFile = packshots.vertical!;
      else if (template?.size === 'square') packshotFile = packshots.square!;
      else packshotFile = packshots.horizontal!;

      return processVariant(service, template!, variant, sourceVideo, packshotFile);
    });

    try {
      await Promise.all(renderPromises);
      toast.success('Все варианты видео готовы!');
    } catch (error) {
      toast.error('Ошибка при генерации видео');
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const processVariant = async (service: CreatomateService, template: any, variant: VideoVariant, videoFile: File, packshotFile: File) => {
    try {
      // Update status to generating
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'generating' } : v
      ));

      // Start rendering
      const renderId = await service.renderVideo(template, videoFile, packshotFile);
      
      // Poll for completion
      const videoUrl = await service.pollRenderStatus(renderId, (progress) => {
        setVariants(prev => prev.map(v => 
          v.id === variant.id ? { ...v, progress } : v
        ));
      });

      // Mark as completed
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { 
          ...v, 
          status: 'completed',
          url: videoUrl,
          progress: 100
        } : v
      ));

      // Update overall progress
      setVariants(current => {
        const completed = current.filter(v => v.status === 'completed').length;
        setOverallProgress((completed / current.length) * 100);
        return current;
      });

    } catch (error) {
      console.error(`Error processing variant ${variant.id}:`, error);
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'error' } : v
      ));
      toast.error(`Ошибка генерации ${variant.name}`);
    }
  };

  const downloadVariant = (variant: VideoVariant) => {
    if (variant.url) {
      const link = document.createElement('a');
      link.href = variant.url;
      link.download = `${variant.name.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
             Выберите бренды и загрузите пакшоты для каждого размера
           </p>
        </div>

        {/* API Key Section */}
        <Card className="p-8 bg-video-surface border-video-primary/20">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-6 w-6 text-video-primary" />
              <h2 className="text-2xl font-semibold">Настройка API</h2>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-key">Creatomate API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Введите ваш API ключ Creatomate"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-video-surface-elevated border-video-primary/30"
              />
              <p className="text-sm text-muted-foreground">
                Получите API ключ на{' '}
                <a 
                  href="https://creatomate.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-video-primary hover:underline"
                >
                  панели управления Creatomate
                </a>
              </p>
            </div>
          </div>
        </Card>

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

            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Размеры видео</h3>
                {CREATOMATE_TEMPLATES.map(template => (
                  <div key={template.id} className="flex items-center gap-3 p-3 bg-video-surface-elevated rounded-lg">
                    <div className="w-2 h-2 bg-video-primary rounded-full"></div>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-muted-foreground">{template.dimensions}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Brand Selection */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Выбор брендов</h3>
                <div className="grid grid-cols-2 gap-4">
                  {AVAILABLE_BRANDS.map(brand => (
                    <div key={brand.id} className="space-y-4">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand.id)}
                          onChange={() => handleBrandToggle(brand.id)}
                          className="rounded border-video-primary/30"
                        />
                        <span className="font-medium">{brand.name}</span>
                      </label>
                      
                      {selectedBrands.includes(brand.id) && (
                        <div className="space-y-3 ml-6 p-4 bg-video-surface-elevated rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">Пакшоты для {brand.name}:</p>
                          
                          {/* Vertical packshot */}
                          <div className="space-y-2">
                            <Label htmlFor={`${brand.id}-vertical`}>Вертикальный (9:16)</Label>
                            <input
                              type="file"
                              accept="video/*,image/*"
                              onChange={handlePackshotUpload(brand.id, 'vertical')}
                              className="hidden"
                              id={`${brand.id}-vertical`}
                            />
                            <label htmlFor={`${brand.id}-vertical`} className="cursor-pointer block">
                              <div className="border-2 border-dashed border-video-secondary/30 rounded-lg p-3 text-center hover:border-video-secondary/50 transition-colors">
                                <p className="text-sm">
                                  {brandPackshots[brand.id]?.vertical?.name || 'Загрузить вертикальный пакшот'}
                                </p>
                              </div>
                            </label>
                          </div>
                          
                          {/* Square packshot */}
                          <div className="space-y-2">
                            <Label htmlFor={`${brand.id}-square`}>Квадратный (1:1)</Label>
                            <input
                              type="file"
                              accept="video/*,image/*"
                              onChange={handlePackshotUpload(brand.id, 'square')}
                              className="hidden"
                              id={`${brand.id}-square`}
                            />
                            <label htmlFor={`${brand.id}-square`} className="cursor-pointer block">
                              <div className="border-2 border-dashed border-video-secondary/30 rounded-lg p-3 text-center hover:border-video-secondary/50 transition-colors">
                                <p className="text-sm">
                                  {brandPackshots[brand.id]?.square?.name || 'Загрузить квадратный пакшот'}
                                </p>
                              </div>
                            </label>
                          </div>
                          
                          {/* Horizontal packshot */}
                          <div className="space-y-2">
                            <Label htmlFor={`${brand.id}-horizontal`}>Горизонтальный (16:9)</Label>
                            <input
                              type="file"
                              accept="video/*,image/*"
                              onChange={handlePackshotUpload(brand.id, 'horizontal')}
                              className="hidden"
                              id={`${brand.id}-horizontal`}
                            />
                            <label htmlFor={`${brand.id}-horizontal`} className="cursor-pointer block">
                              <div className="border-2 border-dashed border-video-secondary/30 rounded-lg p-3 text-center hover:border-video-secondary/50 transition-colors">
                                <p className="text-sm">
                                  {brandPackshots[brand.id]?.horizontal?.name || 'Загрузить горизонтальный пакшот'}
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={generateVariants}
              disabled={!sourceVideo || selectedBrands.length === 0 || !apiKey.trim() || isGenerating}
              className="w-full py-6 text-lg bg-gradient-to-r from-video-primary to-video-secondary hover:opacity-90 transition-opacity"
            >
              <Zap className="h-5 w-5 mr-2" />
              {isGenerating ? 'Генерирую варианты...' : `Создать ${selectedBrands.length * 3} вариантов`}
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
                        <p>Бренд: {variant.brand}</p>
                        <p>Размер: {variant.dimensions}</p>
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