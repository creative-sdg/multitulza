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
import { useVideoUpload, UploadedVideo } from '@/hooks/useVideoUpload';

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


const VideoGenerator = () => {
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [apiKey, setApiKey] = useState<string>('');
  const [creatomateService, setCreatomateService] = useState<CreatomateService | null>(null);
  const { uploadVideo, isUploading, uploadProgress } = useVideoUpload();


  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploaded = await uploadVideo(file);
      if (uploaded) {
        setUploadedVideo(uploaded);
      }
    }
  };

  const generateVariants = async () => {
    console.log('🚀 Starting video generation process...');
    
    if (!uploadedVideo) {
      console.error('❌ No source video uploaded');
      toast.error('Сначала загрузите исходное видео');
      return;
    }

    if (selectedBrands.length === 0) {
      console.error('❌ No brands selected');
      toast.error('Выберите хотя бы один бренд');
      return;
    }

    if (selectedSizes.length === 0) {
      console.error('❌ No sizes selected');
      toast.error('Выберите хотя бы один размер');
      return;
    }

    if (!apiKey.trim()) {
      console.error('❌ No API key provided');
      toast.error('Введите API ключ Creatomate');
      return;
    }

    console.log(`✅ Validation passed. Selected brands: ${selectedBrands.join(', ')}`);
    console.log(`✅ Source video: ${uploadedVideo.file.name} (${uploadedVideo.file.size} bytes)`);
    console.log(`✅ Video URL: ${uploadedVideo.url}`);
    console.log(`✅ API key: ${apiKey.substring(0, 10)}...`);

    const service = new CreatomateService(apiKey);
    setCreatomateService(service);
    setIsGenerating(true);
    setOverallProgress(0);

    // Создаем варианты для каждого бренда и размера
    const newVariants: VideoVariant[] = [];
    selectedBrands.forEach(brandId => {
      const brandName = AVAILABLE_BRANDS.find(b => b.id === brandId)?.name || brandId;
      console.log(`📋 Processing brand: ${brandName} (${brandId})`);
      
      CREATOMATE_TEMPLATES
        .filter(template => selectedSizes.includes(template.size))
        .forEach(template => {
          const variantId = `${brandId}-${template.id}`;
          console.log(`📝 Creating variant: ${variantId}`);
          
          newVariants.push({
            id: variantId,
            name: `${brandName} ${template.name}`,
            brand: brandName,
            size: template.size,
            dimensions: template.dimensions,
            status: 'pending' as const,
            progress: 0
          });
        });
    });

    console.log(`📊 Total variants to generate: ${newVariants.length}`);
    setVariants(newVariants);

    // Process variants with queue (max 2 concurrent)
    const queue = [...newVariants];
    let activeJobs = 0;
    const maxConcurrent = 2;
    let completedCount = 0;
    let errorCount = 0;

    const processNext = async (): Promise<void> => {
      if (queue.length === 0 || activeJobs >= maxConcurrent) return;
      
      const variant = queue.shift()!;
      activeJobs++;
      
      const brandId = selectedBrands.find(id => {
        const brandName = AVAILABLE_BRANDS.find(b => b.id === id)?.name;
        return variant.brand === brandName;
      });
      const template = CREATOMATE_TEMPLATES.find(t => variant.size === t.size);
      const brand = AVAILABLE_BRANDS.find(b => b.id === brandId);
      
      let packshotUrl: string;
      if (template?.size === 'vertical') packshotUrl = brand?.packshots.vertical!;
      else if (template?.size === 'square') packshotUrl = brand?.packshots.square!;
      else packshotUrl = brand?.packshots.horizontal!;

      try {
        await processVariant(service, template!, variant, uploadedVideo.url, packshotUrl);
        completedCount++;
      } catch (error) {
        console.error(`❌ Failed to process variant ${variant.id}:`, error);
        errorCount++;
      }
      
      activeJobs--;
      
      // Update overall progress
      const totalProcessed = completedCount + errorCount;
      setOverallProgress((totalProcessed / newVariants.length) * 100);
      
      // Continue processing queue
      if (queue.length > 0) {
        await processNext();
      }
    };

    try {
      console.log('🎬 Starting queued rendering (max 2 concurrent)...');
      // Start initial jobs
      const initialJobs = [];
      for (let i = 0; i < Math.min(maxConcurrent, newVariants.length); i++) {
        initialJobs.push(processNext());
      }
      
      await Promise.all(initialJobs);
      
      // Wait for all remaining jobs
      while (activeJobs > 0 || queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (queue.length > 0 && activeJobs < maxConcurrent) {
          await processNext();
        }
      }
      
      console.log(`🏁 Generation finished: ${completedCount} completed, ${errorCount} errors`);
      
      if (errorCount === 0) {
        console.log('🎉 All variants completed successfully!');
        toast.success('Все варианты видео готовы!');
      } else if (completedCount > 0) {
        toast.success(`${completedCount} вариантов готовы, ${errorCount} с ошибками`);
      } else {
        toast.error('Все варианты завершились с ошибками');
      }
    } catch (error) {
      console.error('💥 Critical error during generation:', error);
      toast.error('Ошибка при генерации видео');
    } finally {
      console.log('🏁 Generation process finished');
      setIsGenerating(false);
    }
  };

  const processVariant = async (service: CreatomateService, template: any, variant: VideoVariant, inputVideoUrl: string, packshotUrl: string) => {
    console.log(`🎯 Processing variant: ${variant.name} (${variant.id})`);
    console.log(`📋 Template:`, template);
    console.log(`📹 Video URL:`, inputVideoUrl);
    console.log(`🎯 Packshot URL:`, packshotUrl);
    
    try {
      // Update status to generating
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'generating' } : v
      ));

      // Start rendering
      const renderId = await service.renderVideo(template, inputVideoUrl, packshotUrl, uploadedVideo.duration);
      
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
      console.error(`❌ Error processing variant ${variant.id}:`, error);
      console.error(`❌ Variant details:`, { name: variant.name, brand: variant.brand, size: variant.size });
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'error' } : v
      ));
      toast.error(`Ошибка генерации ${variant.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const downloadVariant = (variant: VideoVariant) => {
    if (variant.url) {
      // Open in new tab instead of downloading to avoid blocking current page
      window.open(variant.url, '_blank');
      toast.success(`Открыто в новой вкладке: ${variant.name}`);
    }
  };

  const downloadAllVariants = () => {
    const completedVariants = variants.filter(v => v.status === 'completed' && v.url);
    if (completedVariants.length === 0) {
      toast.error('Нет готовых видео для скачивания');
      return;
    }

    completedVariants.forEach((variant, index) => {
      setTimeout(() => {
        window.open(variant.url!, '_blank');
      }, index * 200); // Delay to avoid popup blocker
    });

    toast.success(`Открыто ${completedVariants.length} вкладок с видео`);
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
              Выберите бренды для автоматической генерации видео во всех форматах
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
                    {uploadedVideo ? uploadedVideo.file.name : isUploading ? 'Загружаю видео...' : 'Загрузите видео файл'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Поддерживаемые форматы: MP4, MOV, AVI
                  </p>
                </div>
              </label>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-video-primary" />
                  <span className="text-sm">Загрузка видео...</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {uploadedVideo && (
              <div className="flex items-center gap-4 p-4 bg-video-surface-elevated rounded-lg">
                <Play className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">{uploadedVideo.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Размер: {(uploadedVideo.file.size / (1024 * 1024)).toFixed(1)} MB
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
              {/* Size Selection */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Размеры видео</h3>
                <div className="grid grid-cols-1 gap-3">
                  {CREATOMATE_TEMPLATES.map(template => (
                    <label key={template.id} className="flex items-center space-x-3 cursor-pointer p-4 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedSizes.includes(template.size)}
                        onChange={() => handleSizeToggle(template.size)}
                        className="rounded border-video-primary/30"
                      />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.dimensions}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand Selection */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Выбор брендов</h3>
                <div className="grid grid-cols-2 gap-4">
                  {AVAILABLE_BRANDS.map(brand => (
                    <label key={brand.id} className="flex items-center space-x-3 cursor-pointer p-4 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand.id)}
                        onChange={() => handleBrandToggle(brand.id)}
                        className="rounded border-video-primary/30"
                      />
                      <span className="font-medium">{brand.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                <p>Примерная стоимость: ${(selectedBrands.length * selectedSizes.length * 0.5).toFixed(1)} | Время генерации: ~{selectedBrands.length * selectedSizes.length * 1}-{selectedBrands.length * selectedSizes.length * 2} минут</p>
              </div>
              
              <Button 
                onClick={generateVariants}
                disabled={!uploadedVideo || selectedBrands.length === 0 || selectedSizes.length === 0 || !apiKey.trim() || isGenerating || isUploading}
                className="w-full py-6 text-lg bg-gradient-to-r from-video-primary to-video-secondary hover:opacity-90 transition-opacity"
              >
                <Zap className="h-5 w-5 mr-2" />
                {isGenerating ? 'Генерирую варианты...' : isUploading ? 'Загружаю видео...' : `Создать ${selectedBrands.length * selectedSizes.length} вариантов`}
              </Button>
            </div>
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
                {variants.filter(v => v.status === 'completed').length > 1 && (
                  <Button 
                    onClick={downloadAllVariants}
                    className="bg-success hover:bg-success/90"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать все ({variants.filter(v => v.status === 'completed').length})
                  </Button>
                )}
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