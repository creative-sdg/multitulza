import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Volume2, 
  Upload, 
  Download,
  RefreshCw,
  Mic,
  Play,
  Pause,
  Video
} from 'lucide-react';
import { toast } from 'sonner';
import { googleSheetsService, TextBlock } from '@/services/googleSheetsService';
import { elevenLabsService, AVAILABLE_VOICES, VoiceOption } from '@/services/elevenLabsService';
import { AVAILABLE_BRANDS } from '@/services/creatomateService';
import { useVideoUpload } from '@/hooks/useVideoUpload';

interface TextScenarioControlsProps {
  onTextReady: (finalText: string, audioUrl?: string, options?: { enableSubtitles?: boolean; enableVoiceover?: boolean }) => void;
  onBrandChange: (brands: string[]) => void;
  onVideoReady?: (video: { file: File; url: string; path: string; duration?: number }) => void;
}

const TextScenarioControls: React.FC<TextScenarioControlsProps> = ({ 
  onTextReady, 
  onBrandChange,
  onVideoReady 
}) => {
  const [currentTextBlock, setCurrentTextBlock] = useState<TextBlock | null>(null);
  const [rowNumber, setRowNumber] = useState<number>(2);
  const [editedText, setEditedText] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandReplacements, setBrandReplacements] = useState<{[key: string]: string}>({});
  
  // Video upload for text scenario
  const { uploadVideo, isUploading, uploadProgress } = useVideoUpload();
  const [uploadedVideo, setUploadedVideo] = useState<{ file: File; url: string; path: string; duration?: number } | null>(null);
  
  // Audio generation
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [generateAudio, setGenerateAudio] = useState(true);
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string>('');
  
  // Loading states
  const [isLoadingBlock, setIsLoadingBlock] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const loadTextBlock = async (row: number) => {
    setIsLoadingBlock(true);
    try {
      const block = await googleSheetsService.getTextBlock(row);
      if (block) {
        setCurrentTextBlock(block);
        generateTextFromBlock(block);
        toast.success(`Загружен текст из строки ${row}`);
      } else {
        toast.error(`Нет данных в строке ${row}`);
        setEditedText('');
        setCurrentTextBlock(null);
      }
    } catch (error) {
      toast.error('Ошибка загрузки текста из Google Sheets');
      console.error(error);
    } finally {
      setIsLoadingBlock(false);
    }
  };

  const handleRowNumberChange = (newRowNumber: number) => {
    setRowNumber(newRowNumber);
    if (newRowNumber >= 2) {
      loadTextBlock(newRowNumber);
    }
  };

  const generateTextFromBlock = (block: TextBlock) => {
    const textParts = [
      block.hook,
      block.problem,
      block.solution,
      block.proof,
      block.offer,
      block.urgency,
      block.cta,
      block.bodyLine1,
      block.bodyLine2,
      block.bodyLine3,
      block.bodyLine4,
      block.bodyLine5,
      block.bodyLine6,
      block.bodyLine7,
      block.bodyLine8,
      block.bodyLine9,
    ].filter(Boolean);
    
    const combinedText = textParts.join(' ');
    setEditedText(combinedText);
  };


  const handleBrandToggle = (brandId: string) => {
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter(b => b !== brandId)
      : [...selectedBrands, brandId];
    
    setSelectedBrands(newBrands);
    onBrandChange(newBrands);
  };

  const applyBrandReplacements = (text: string): string => {
    let processedText = text;
    
    // Apply brand replacements
    Object.entries(brandReplacements).forEach(([original, replacement]) => {
      if (replacement.trim()) {
        const regex = new RegExp(original, 'gi');
        processedText = processedText.replace(regex, replacement);
      }
    });
    
    return processedText;
  };

  // Get preview text with replacements applied
  const getPreviewText = () => {
    return applyBrandReplacements(editedText);
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploaded = await uploadVideo(file);
      if (uploaded) {
        setUploadedVideo(uploaded);
        onVideoReady?.(uploaded);
      }
    }
  };

  const handleGenerateAudio = async () => {
    if (!selectedVoice || !editedText.trim()) {
      toast.error('Выберите голос и введите текст');
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const finalText = applyBrandReplacements(editedText);
      const audioUrl = await elevenLabsService.generateAudio(finalText, selectedVoice);
      setGeneratedAudioUrl(audioUrl);
      toast.success('Аудио сгенерировано успешно');
    } catch (error) {
      toast.error('Ошибка генерации аудио');
      console.error(error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedAudioFile(file);
      setGeneratedAudioUrl('');
      toast.success('Аудио файл загружен');
    }
  };

  const handleFinalize = () => {
    const finalText = applyBrandReplacements(editedText);
    const audioUrl = uploadedAudioFile ? URL.createObjectURL(uploadedAudioFile) : generatedAudioUrl;
    
    if (generateAudio && !audioUrl) {
      toast.error('Сначала сгенерируйте или загрузите аудио');
      return;
    }

    onTextReady(finalText, generateAudio ? audioUrl : undefined, { 
      enableSubtitles, 
      enableVoiceover: generateAudio 
    });
    toast.success('Текст и настройки готовы для генерации видео');
  };

  const playAudio = () => {
    if (currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play();
        setIsPlaying(true);
      }
    } else {
      const audioUrl = uploadedAudioFile ? URL.createObjectURL(uploadedAudioFile) : generatedAudioUrl;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        setCurrentAudio(audio);
        setIsPlaying(true);
        audio.play();
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentAudio(null);
        });
      }
    }
  };

  return (
    <Card className="p-8 bg-video-surface border-video-primary/20">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-video-primary" />
          <h2 className="text-2xl font-semibold">Работа с текстами</h2>
        </div>

        {/* Video Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-6 w-6 text-video-primary" />
            <h3 className="font-medium text-lg">Загрузка видео</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="video-upload">Выберите видео файл</Label>
              <Input
                id="video-upload"
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                disabled={isUploading}
                className="mt-2"
              />
            </div>
            
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Загрузка видео...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}
            
            {uploadedVideo && (
              <div className="flex items-center gap-3 p-3 bg-video-surface-elevated rounded-lg">
                <Video className="h-5 w-5 text-success" />
                <div className="flex-1">
                  <div className="font-medium">{uploadedVideo.file.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(uploadedVideo.file.size / (1024 * 1024)).toFixed(1)} MB
                    {uploadedVideo.duration && ` • ${uploadedVideo.duration.toFixed(1)}s`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row Number Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-lg">Выбор текста</h3>
          </div>
          
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Номер строки (от 2 до 1000)</Label>
              <Input
                type="number"
                min="2"
                max="1000"
                value={rowNumber}
                onChange={(e) => setRowNumber(parseInt(e.target.value) || 2)}
                placeholder="Введите номер строки"
              />
            </div>
            <Button 
              onClick={() => handleRowNumberChange(rowNumber)}
              disabled={isLoadingBlock || rowNumber < 2}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingBlock ? 'animate-spin' : ''}`} />
              Загрузить
            </Button>
          </div>

          {currentTextBlock && (
            <div className="text-sm text-muted-foreground">
              Загружен текст из строки {rowNumber}
            </div>
          )}
        </div>

        {/* Text Editor */}
        <div className="space-y-4">
          <Label>Редактирование текста</Label>
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Здесь будет отображен выбранный текст для редактирования"
            className="min-h-[200px]"
          />
        </div>

        {/* Brand Replacement */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Замена брендов</h3>
          <div className="space-y-3">
            <h4 className="font-medium">Ручная замена текста</h4>
            {Object.keys(brandReplacements).length > 0 ? (
              Object.entries(brandReplacements).map(([original, replacement], index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Текст для замены"
                      value={original}
                      onChange={(e) => {
                        const newReplacements = { ...brandReplacements };
                        delete newReplacements[original];
                        newReplacements[e.target.value] = replacement;
                        setBrandReplacements(newReplacements);
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        const newReplacements = { ...brandReplacements };
                        delete newReplacements[original];
                        setBrandReplacements(newReplacements);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="ml-6">
                    <Label className="text-sm text-muted-foreground mb-2 block">Выберите замену:</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_BRANDS.map(brand => (
                        <label key={brand.id} className="flex items-center space-x-2 cursor-pointer p-2 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors">
                          <input
                            type="radio"
                            name={`replacement-${index}`}
                            checked={replacement === brand.name}
                            onChange={() => {
                              setBrandReplacements(prev => ({
                                ...prev,
                                [original]: brand.name
                              }));
                              // Also update selected brands for packshot
                              const newBrands = selectedBrands.includes(brand.id)
                                ? selectedBrands
                                : [...selectedBrands.filter(b => !AVAILABLE_BRANDS.find(br => br.name === replacement)?.id || b !== AVAILABLE_BRANDS.find(br => br.name === replacement)?.id), brand.id];
                              setSelectedBrands(newBrands);
                              onBrandChange(newBrands);
                            }}
                            className="rounded border-video-primary/30"
                          />
                          <span className="text-sm font-medium">{brand.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">Нет настроенных замен</div>
            )}
            
            <Button
              onClick={() => setBrandReplacements(prev => ({ ...prev, '': '' }))}
              variant="outline"
              size="sm"
            >
              + Добавить замену
            </Button>
          </div>
          
          {/* Text Preview */}
          {editedText && (
            <div className="space-y-2">
              <Label>Превью текста с заменами</Label>
              <div className="p-3 bg-video-surface-elevated rounded-lg border border-video-primary/20">
                <div className="text-sm whitespace-pre-wrap">{getPreviewText()}</div>
              </div>
              <Label>Финальный текст (можно редактировать)</Label>
              <Textarea
                value={getPreviewText()}
                onChange={(e) => {
                  // Allow manual editing of the final text
                  setEditedText(e.target.value);
                  setBrandReplacements({}); // Clear replacements if manually edited
                }}
                className="min-h-[100px]"
              />
            </div>
          )}
        </div>

        {/* Audio & Subtitles Options */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Настройки аудио и субтитров</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={enableSubtitles}
                onChange={(e) => setEnableSubtitles(e.target.checked)}
                className="rounded border-video-primary/30"
              />
              <span className="font-medium">Включить субтитры</span>
            </label>
            
            <label className="flex items-center space-x-3 p-3 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={generateAudio}
                onChange={(e) => setGenerateAudio(e.target.checked)}
                className="rounded border-video-primary/30"
              />
              <span className="font-medium">Включить озвучку</span>
            </label>
          </div>

          {generateAudio && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label>Выбор голоса</Label>
                  <Select onValueChange={setSelectedVoice}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите голос" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VOICES.map(voice => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender === 'male' ? 'мужской' : 'женский'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Audio Upload */}
                <div className="space-y-2">
                  <Label>Или загрузить свое аудио</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="flex-1"
                    />
                    {uploadedAudioFile && (
                      <Button onClick={playAudio} variant="outline" size="sm">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Generate Audio Button */}
              {!uploadedAudioFile && (
                <Button 
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio || !selectedVoice || !editedText.trim()}
                  className="w-full"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  {isGeneratingAudio ? 'Генерирую аудио...' : 'Сгенерировать аудио'}
                </Button>
              )}

              {/* Audio Preview */}
              {generatedAudioUrl && (
                <div className="flex items-center gap-3 p-3 bg-video-surface-elevated rounded-lg">
                  <Volume2 className="h-5 w-5 text-success" />
                  <span className="flex-1">Аудио сгенерировано</span>
                  <Button onClick={playAudio} variant="outline" size="sm">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Finalize */}
        <Button 
          onClick={handleFinalize}
          disabled={!editedText.trim() || (generateAudio && !generatedAudioUrl && !uploadedAudioFile)}
          className="w-full py-6 text-lg bg-gradient-to-r from-video-primary to-video-secondary hover:opacity-90 transition-opacity"
        >
          <FileText className="h-5 w-5 mr-2" />
          Готово к генерации видео
        </Button>
      </div>
    </Card>
  );
};

export default TextScenarioControls;