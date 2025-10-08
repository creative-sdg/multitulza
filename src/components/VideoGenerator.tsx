import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, Play, Download, Zap, Video, Settings, Key, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { CreatomateService, CREATOMATE_TEMPLATES, RESIZE_TEMPLATES, AVAILABLE_BRANDS } from '@/services/creatomateService';
import { useVideoUpload, UploadedVideo } from '@/hooks/useVideoUpload';
import ChunkedAudioScenario from '@/components/ChunkedAudioScenario';

// Helper function to apply brand replacement to text
const applyBrandReplacement = (text: string, brandName: string): string => {
  let processedText = text;
  
  // Replace all brand mentions with the target brand name
  const brandPatterns = [
    'DateMyAge',
    'Date My Age',
    'OurLove',
    'Our Love',
    'EuroDate',
    'Euro Date',
    'DatingClub',
    'Dating Club',
    'Dating.com',
  ];
  
  brandPatterns.forEach(pattern => {
    const regex = new RegExp(pattern, 'gi');
    processedText = processedText.replace(regex, brandName);
  });
  
  return processedText;
};

interface VideoVariant {
  id: string;
  name: string;
  size: string;
  dimensions: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  progress: number;
  url?: string;
}


interface VideoGeneratorProps {
  scenario?: 'with-audio' | 'chunked-audio';
}

const VideoGenerator = ({ scenario: propScenario }: VideoGeneratorProps = {}) => {
  // Scenario selection
  const [scenario, setScenario] = useState<'with-audio' | 'chunked-audio' | null>(propScenario || null);
  
  // Original video workflow
  const [uploadedVideo, setUploadedVideo] = useState<UploadedVideo | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  
  
  // Chunked audio scenario workflow
  const [chunkedAudioData, setChunkedAudioData] = useState<any[]>([]);
  const [textBlocks, setTextBlocks] = useState<string[]>([]);
  const [customTextEnabled, setCustomTextEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Template specific options
  const [subtitleVisibility, setSubtitleVisibility] = useState(100);
  const [audioVolume, setAudioVolume] = useState(100);
  
  // Handle subtitle visibility change - when subtitles are enabled (>0), 
  // custom text becomes invisible and vice versa
  const handleSubtitleVisibilityChange = (value: number) => {
    setSubtitleVisibility(value);
  };
  
  // For with-audio scenario: simple checkbox for subtitles
  const [enableSubtitlesCheckbox, setEnableSubtitlesCheckbox] = useState(true);
  
  // Always enable subtitles for chunked audio scenario
  const enableSubtitles = scenario === 'with-audio' ? enableSubtitlesCheckbox : true;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<VideoVariant[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [apiKey, setApiKey] = useState<string>('d4a139301941487db1cd588ba460366fe6cee2119361a4440d2846440738d92dfe9053c8c55cedcbcfa5ef6131916e22');
  const [creatomateService, setCreatomateService] = useState<CreatomateService | null>(null);
  const { uploadVideo, isUploading, uploadProgress } = useVideoUpload();



  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const handleBrandToggle = (brandId: string) => {
    setSelectedBrands(prev => 
      prev.includes(brandId) 
        ? prev.filter(b => b !== brandId)
        : [...prev, brandId]
    );
  };

  const handleBrandChange = (brands: string[]) => {
    setSelectedBrands(brands);
  };

  const handleChunkedAudioReady = (chunks: any[], options?: { 
    textBlocks?: string[]; 
    customTextEnabled?: boolean;
  }) => {
    setChunkedAudioData(chunks);
    if (options?.textBlocks) setTextBlocks(options.textBlocks);
    if (options?.customTextEnabled !== undefined) setCustomTextEnabled(options.customTextEnabled);
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
    
    // Validation based on scenario
    if (scenario === 'with-audio') {
      if (!uploadedVideo) {
        console.error('❌ No source video uploaded');
        toast.error('Сначала загрузите исходное видео');
        return;
      }
    } else if (scenario === 'chunked-audio') {
      if (chunkedAudioData.length === 0) {
        console.error('❌ No chunked audio data');
        toast.error('Подготовьте звуки по кусочкам');
        return;
      }
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

    console.log(`✅ Validation passed for scenario: ${scenario}`);
    if (scenario === 'with-audio' && uploadedVideo) {
      console.log(`✅ Source video: ${uploadedVideo.file.name} (${uploadedVideo.file.size} bytes)`);
      console.log(`✅ Video URL: ${uploadedVideo.url}`);
    }
    console.log(`✅ API key: ${apiKey.substring(0, 10)}...`);

    const service = new CreatomateService(apiKey);
    setCreatomateService(service);
    setIsGenerating(true);
    setOverallProgress(0);

    // Select templates based on scenario
    const templates = scenario === 'with-audio' ? RESIZE_TEMPLATES : CREATOMATE_TEMPLATES;
    
    // Создаем варианты в зависимости от выбранных брендов
    const newVariants: VideoVariant[] = [];
    
    if (selectedBrands.length > 0) {
      // Режим с брендами (пакшоты включены)
      console.log('📋 Processing branded mode');
      console.log(`📋 Selected brands: ${selectedBrands.join(', ')}`);
      
      selectedBrands.forEach(brandId => {
        const brand = AVAILABLE_BRANDS.find(b => b.id === brandId);
        if (!brand) return;
        
        templates
          .filter(template => selectedSizes.includes(template.size))
          .forEach(template => {
            const variantId = `branded-${brandId}-${template.id}`;
            const packshot = brand.packshots[template.size as keyof typeof brand.packshots];
            
            console.log(`📝 Creating branded variant: ${variantId}`);
            console.log(`📋 Brand: ${brand.name}, Template: ${template.name}, Packshot: ${packshot}`);
            
            newVariants.push({
              id: variantId,
              name: `${brand.name} - ${template.name}`,
              size: template.size,
              dimensions: template.dimensions,
              status: 'pending' as const,
              progress: 0
            });
          });
      });
    } else {
      // Режим без брендов (только ресайз)
      console.log('📋 Processing resize-only mode');
      
      templates
        .filter(template => selectedSizes.includes(template.size))
        .forEach(template => {
          const variantId = `resize-${template.id}`;
          console.log(`📝 Creating resize variant: ${variantId}`);
          
          newVariants.push({
            id: variantId,
            name: template.name,
            size: template.size,
            dimensions: template.dimensions,
            status: 'pending' as const,
            progress: 0
          });
        });
    }

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
      
      // Select templates based on scenario
      const templates = scenario === 'with-audio' ? RESIZE_TEMPLATES : CREATOMATE_TEMPLATES;
      
      // Определяем тип варианта и соответствующий шаблон
      let template: any;
      let packshot: string | undefined;
      
      if (variant.id.startsWith('branded-')) {
        // Режим с брендами
        const parts = variant.id.split('-');
        const brandId = parts[1];
        const brand = AVAILABLE_BRANDS.find(b => b.id === brandId);
        template = templates.find(t => variant.size === t.size);
        packshot = brand?.packshots[variant.size as keyof typeof brand.packshots];
        
        console.log(`🏷️ Branded variant - Brand: ${brand?.name}, Packshot: ${packshot}`);
      } else {
        // Режим без брендов
        template = templates.find(t => variant.size === t.size);
        console.log(`📋 Resize-only variant using template: ${template?.name}`);
      }

      try {
        await processVariant(service, template!, variant, scenario === 'with-audio' ? uploadedVideo!.url : '', packshot);
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

  const processVariant = async (service: CreatomateService, template: any, variant: VideoVariant, inputVideoUrl: string, packshot?: string) => {
    console.log(`🎯 Processing variant: ${variant.name} (${variant.id})`);
    console.log(`📋 Template:`, template);
    
    if (scenario === 'with-audio') {
      console.log(`📹 Video URL:`, inputVideoUrl);
    }
    
    try {
      // Update status to generating
      setVariants(prev => prev.map(v => 
        v.id === variant.id ? { ...v, status: 'generating' } : v
      ));

      // Start rendering
      const options: any = {};
      if (enableSubtitles) options.enableSubtitles = true;
      
      let renderId: string;
      if (scenario === 'with-audio') {
        renderId = await service.renderVideo(template, inputVideoUrl, packshot, uploadedVideo?.duration, options);
      } else if (scenario === 'chunked-audio') {
        // For chunked audio scenario, use the chunked audio data
        // Extract brand name from variant ID if it's a branded variant
        let brandName: string | undefined;
        let brandedAudioData = chunkedAudioData;
        
        if (variant.id.startsWith('branded-')) {
          const parts = variant.id.split('-');
          const brandId = parts[1];
          const brand = AVAILABLE_BRANDS.find(b => b.id === brandId);
          brandName = brand?.name;
          
          // Generate brand-specific audio for each chunk
          if (brandName) {
            console.log(`🎤 Generating brand-specific audio for ${brandName}...`);
            brandedAudioData = await Promise.all(chunkedAudioData.map(async (chunk) => {
              // Apply brand replacement to the text
              const brandedText = applyBrandReplacement(chunk.text, brandName!);
              
              // If text is the same, use existing audio
              if (brandedText === chunk.text && chunk.audioUrl) {
                return chunk;
              }
              
              // Generate new audio for this brand
              try {
                const { supabase } = await import('@/integrations/supabase/client');
                const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
                  body: {
                    text: brandedText,
                    voiceId: chunk.audioUrl ? 'TX3LPaxmHKxFdv7VOQHJ' : undefined // Use same voice
                  }
                });
                
                if (error || !data?.audioUrl) {
                  console.error('Error generating branded audio:', error);
                  return chunk; // Fallback to original
                }
                
                console.log(`✅ Generated branded audio for chunk: "${brandedText.substring(0, 30)}..."`);
                
                // Calculate effective duration
                const effectiveDuration = Math.max(2, data.duration || 0);
                
                return {
                  ...chunk,
                  text: brandedText,
                  audioUrl: data.audioUrl,
                  audioDuration: data.duration,
                  effectiveDuration
                };
              } catch (error) {
                console.error('Error generating branded audio:', error);
                return chunk; // Fallback to original
              }
            }));
            
            // Recalculate start times for the branded audio
            let currentTime = 0;
            brandedAudioData = brandedAudioData.map((chunk) => {
              const updatedChunk = { ...chunk, startTime: currentTime };
              if (chunk.effectiveDuration) {
                currentTime += chunk.effectiveDuration;
              }
              return updatedChunk;
            });
          }
        }
        
        const renderOptions = {
          ...options,
          chunkedAudio: brandedAudioData,
          textBlocks: textBlocks,
          customTextEnabled: customTextEnabled,
          subtitleVisibility: subtitleVisibility,
          audioVolume: audioVolume,
          selectedTemplate: selectedTemplate,
          brandName: brandName // Pass brand name for text replacement
        };
        
        renderId = await service.renderVideo(template, '', packshot, 30, renderOptions);
      } else {
        throw new Error('Invalid scenario configuration');
      }
      
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
      console.error(`❌ Variant details:`, { name: variant.name, size: variant.size });
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
      {/* API Settings Button - Fixed in top right corner */}
      <div className="fixed top-4 right-4 z-50">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-video-surface border-video-primary/30 hover:bg-video-primary/10"
            >
              <Settings className="h-5 w-5 text-video-primary" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-video-surface border-video-primary/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-video-primary" />
                Настройка API
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
          </DialogContent>
        </Dialog>
      </div>

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
              Выберите сценарий для создания видео
            </p>
        </div>


        {/* Scenario Selection */}
        {!propScenario && !scenario && (
          <Card className="p-8 bg-video-surface border-video-primary/20">
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Выберите сценарий работы</h2>
                <p className="text-muted-foreground">
                  Определите, какой тип видео вы хотите создать
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Button
                  onClick={() => setScenario('with-audio')}
                  className="h-32 flex-col gap-4 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border border-video-primary/30"
                  variant="outline"
                >
                  <Video className="h-8 w-8 text-video-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Ресайзы + Ребренды. Без работы над текстом</div>
                    <div className="text-sm text-muted-foreground">Загрузите видео с готовой озвучкой</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => setScenario('chunked-audio')}
                  className="h-32 flex-col gap-4 bg-video-surface-elevated hover:bg-video-primary/10 text-foreground border border-video-primary/30"
                  variant="outline"
                >
                  <Zap className="h-8 w-8 text-video-primary" />
                  <div className="text-center">
                    <div className="font-semibold">Сбор аудио- и видеоэлементов. Работа над текстом</div>
                    <div className="text-sm text-muted-foreground">Каждый текст озвучивается отдельно</div>
                  </div>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Chunked Audio Scenario */}
        {scenario === 'chunked-audio' && (
          <ChunkedAudioScenario 
            onReady={handleChunkedAudioReady}
            onBrandChange={handleBrandChange}
          />
        )}


        {/* Upload Section */}
        {scenario === 'with-audio' && (
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
        )}

        {/* Generation Section */}
        {scenario && (
        <Card className="p-8 bg-video-surface border-video-primary/20">
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="h-6 w-6 text-video-primary" />
              <h2 className="text-2xl font-semibold">Параметры генерации</h2>
            </div>

            <div className="space-y-6">
              {/* Common Parameters Section - only for chunked-audio */}
              {scenario === 'chunked-audio' && (
                <div className="space-y-4 p-4 border rounded-lg bg-video-surface-elevated">
                  <h3 className="font-medium text-lg">Общие параметры</h3>
                  <div className="text-xs text-muted-foreground mb-2">
                    ⚠️ Логика: либо субтитры + озвучка, либо кастомный текст без озвучки
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="subtitle-audio-mode"
                      checked={subtitleVisibility === 100 && audioVolume === 100}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Enable subtitles + audio mode
                          setSubtitleVisibility(100);
                          setAudioVolume(100);
                        } else {
                          // Enable custom text mode (no audio, no subtitles)
                          setSubtitleVisibility(0);
                          setAudioVolume(0);
                        }
                      }}
                      className="rounded border-video-primary/30"
                    />
                    <Label htmlFor="subtitle-audio-mode" className="text-sm">
                      {(subtitleVisibility === 100 && audioVolume === 100) 
                        ? 'Субтитры + озвучка' 
                        : 'Кастомный текст без озвучки'}
                    </Label>
                  </div>
                </div>
              )}

              {/* Simple subtitles checkbox for with-audio */}
              {scenario === 'with-audio' && (
                <div className="space-y-4 p-4 border rounded-lg bg-video-surface-elevated">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enable-subtitles"
                      checked={enableSubtitlesCheckbox}
                      onChange={(e) => setEnableSubtitlesCheckbox(e.target.checked)}
                      className="rounded border-video-primary/30"
                    />
                    <Label htmlFor="enable-subtitles" className="text-sm">Показать субтитры</Label>
                  </div>
                </div>
              )}

              {/* Size Selection */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Размеры видео</h3>
                 <div className="grid grid-cols-1 gap-3">
                     {(scenario === 'with-audio' ? RESIZE_TEMPLATES : CREATOMATE_TEMPLATES).map(template => (
                      <div key={template.id}>
                        <label className="flex items-center space-x-3 cursor-pointer p-4 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(template.size)}
                           onChange={() => {
                             handleSizeToggle(template.size);
                             if (template.size === '9x16') {
                               setSelectedTemplate(template);
                             }
                           }}
                           className="rounded border-video-primary/30"
                         />
                         <div>
                           <p className="font-medium">{template.name}</p>
                           <p className="text-sm text-muted-foreground">{template.dimensions}</p>
                         </div>
                       </label>
                      </div>
                   ))}
                </div>
              </div>

              {/* Brand Selection */}
              <div className="space-y-4">
                <h3 className="font-medium text-lg">Выбор бренда</h3>
                <div className="grid grid-cols-2 gap-3">
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
                <p>Режим ресайза: ${(selectedSizes.length * 0.3).toFixed(1)} | Время генерации: ~{selectedSizes.length * 1}-{selectedSizes.length * 1.5} минут</p>
              </div>
              
              <Button 
                onClick={generateVariants}
                disabled={
                  !apiKey.trim() || 
                  isGenerating || 
                  isUploading ||
                  selectedSizes.length === 0 ||
                  (scenario === 'with-audio' && !uploadedVideo) ||
                  (scenario === 'chunked-audio' && chunkedAudioData.length === 0)
                }
                className="w-full py-6 text-lg bg-gradient-to-r from-video-primary to-video-secondary hover:opacity-90 transition-opacity"
              >
                <Zap className="h-5 w-5 mr-2" />
                {isGenerating ? 'Генерирую варианты...' : isUploading ? 'Загружаю видео...' : 
                  (() => {
                    const totalVariants = selectedBrands.length > 0 
                      ? selectedSizes.length * selectedBrands.length 
                      : selectedSizes.length;
                    return `Создать ${totalVariants} ${selectedBrands.length > 0 ? 'вариантов с пекшотами' : 'ресайзов'}`;
                  })()
                }
              </Button>
            </div>
          </div>
        </Card>
        )}

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