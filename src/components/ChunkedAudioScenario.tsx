import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Upload, Trash2, FileText, Volume2, Key, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVideoUpload, UploadedVideo } from '@/hooks/useVideoUpload';
import { AVAILABLE_VOICES, VoiceOption } from '@/services/elevenLabsService';
import { AVAILABLE_BRANDS } from '@/services/creatomateService';

interface AudioChunk {
  id: number;
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  effectiveDuration?: number; // Минимум 2 секунды или реальная длительность
  startTime?: number; // Время начала на таймлайне
  isGenerating: boolean;
  videoFile?: UploadedVideo;
}

interface ChunkedAudioScenarioProps {
  onReady: (chunks: AudioChunk[], textBlocks?: string[], useTextMode?: boolean) => void;
  onBrandChange: (brands: string[]) => void;
}

const ChunkedAudioScenario: React.FC<ChunkedAudioScenarioProps> = ({ onReady, onBrandChange }) => {
  // ElevenLabs API Key - используем сохраненный ключ
  
  // Google Sheets
  const [tableId, setTableId] = useState('');
  const [rowNumber, setRowNumber] = useState('');
  const [texts, setTexts] = useState<string[]>([]);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  
  // Text Mode Selection
  const [useTextMode, setUseTextMode] = useState(false);
  const [textBlocks, setTextBlocks] = useState<string[]>([]);
  const [textTableId, setTextTableId] = useState('');
  const [textRowNumber, setTextRowNumber] = useState('');
  
  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState<string>('TX3LPaxmHKxFdv7VOQHJ'); // Liam voice by default
  
  // Brand replacement functionality
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandReplacements, setBrandReplacements] = useState<{[key: string]: string}>({});
  
  // Audio controls
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { uploadVideo, isUploading } = useVideoUpload();

  // Load texts from Google Sheets
  const loadTexts = async () => {
    if (!tableId.trim()) {
      toast.error('Введите ID таблицы');
      return;
    }
    
    if (!rowNumber.trim()) {
      toast.error('Введите номер строки');
      return;
    }

    const row = parseInt(rowNumber);
    if (isNaN(row) || row < 1 || row > 1000) {
      toast.error('Номер строки должен быть от 1 до 1000');
      return;
    }

    setIsLoadingTexts(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: { 
          spreadsheetId: tableId,
          rowNumber: row
        }
      });

      if (error) throw error;

      if (data.texts && data.texts.length > 0) {
        // Limit to 10 chunks maximum
        const limitedTexts = data.texts.slice(0, 10);
        setTexts(limitedTexts);
        
        // Initialize chunks and apply brand replacements
        const initialChunks: AudioChunk[] = limitedTexts.map((text, index) => ({
          id: index + 1,
          text: applyBrandReplacements(text),
          isGenerating: false
        }));
        
        setChunks(initialChunks);
        toast.success(`Загружено ${limitedTexts.length} текстов`);
        
        // Auto-set brands for packshots
        if (selectedBrands.length === 0) {
          setSelectedBrands(['datemyage']); // Default brand
          onBrandChange(['datemyage']);
        }
      } else {
        toast.error('Тексты не найдены в таблице');
      }
    } catch (error: any) {
      console.error('Error loading texts:', error);
      toast.error(`Ошибка загрузки: ${error.message}`);
    } finally {
      setIsLoadingTexts(false);
    }
  };

  // Apply brand replacements to text
  const applyBrandReplacements = (text: string): string => {
    let processedText = text;
    
    Object.entries(brandReplacements).forEach(([original, replacement]) => {
      if (replacement.trim()) {
        const regex = new RegExp(original, 'gi');
        processedText = processedText.replace(regex, replacement);
      }
    });
    
    return processedText;
  };

  // Apply brand replacements to all chunks
  const applyReplacementsToAllChunks = () => {
    setChunks(prev => prev.map(chunk => ({
      ...chunk,
      text: applyBrandReplacements(texts[chunk.id - 1] || chunk.text)
    })));
    toast.success('Изменения применены ко всем текстам');
  };

  // Handle brand toggle for quick replacement
  const handleBrandToggle = (brandId: string, replacementWord: string) => {
    const brand = AVAILABLE_BRANDS.find(b => b.id === brandId);
    if (!brand) return;

    // Update brand replacements
    setBrandReplacements(prev => ({
      ...prev,
      [replacementWord]: brand.name
    }));

    // Update selected brands for packshots
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands
      : [...selectedBrands.filter(b => !AVAILABLE_BRANDS.find(br => br.name === brandReplacements[replacementWord])?.id || b !== AVAILABLE_BRANDS.find(br => br.name === brandReplacements[replacementWord])?.id), brandId];
    
    setSelectedBrands(newBrands);
    onBrandChange(newBrands);

    // Apply replacements to existing chunks
    setChunks(prev => prev.map(chunk => ({
      ...chunk,
      text: applyBrandReplacements(chunk.text)
    })));

    toast.success(`Бренд ${brand.name} выбран для замены "${replacementWord}"`);
  };

  // Generate audio for a specific chunk
  const generateAudio = async (chunkId: number) => {

    const chunk = chunks.find(c => c.id === chunkId);
    if (!chunk || !chunk.text.trim()) {
      toast.error('Текст пуст');
      return;
    }

    setChunks(prev => prev.map(c => 
      c.id === chunkId ? { ...c, isGenerating: true } : c
    ));

    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs', {
        body: {
          text: chunk.text,
          voiceId: selectedVoice
        }
      });

      if (error) throw error;

      // Рассчитываем эффективную длительность (минимум 2 секунды)
      const effectiveDuration = Math.max(2, data.duration || 0);
      
      setChunks(prev => {
        const updatedChunks = prev.map(c => 
          c.id === chunkId 
            ? { 
                ...c, 
                audioUrl: data.audioUrl, 
                audioDuration: data.duration, 
                effectiveDuration,
                isGenerating: false 
              }
            : c
        );
        
        // Пересчитываем время начала для всех чанков
        return calculateStartTimes(updatedChunks);
      });

      toast.success(`Звук ${chunkId} готов (${data.duration?.toFixed(1)}с, эффективная: ${effectiveDuration.toFixed(1)}с)`);
    } catch (error: any) {
      console.error('Error generating audio:', error);
      toast.error(`Ошибка генерации звука: ${error.message}`);
      setChunks(prev => prev.map(c => 
        c.id === chunkId ? { ...c, isGenerating: false } : c
      ));
    }
  };

  // Generate all audio chunks
  const generateAllAudio = async () => {
    const chunksToGenerate = chunks.filter(c => c.text.trim() && !c.audioUrl);
    if (chunksToGenerate.length === 0) {
      toast.error('Нет текстов для генерации');
      return;
    }

    toast.success(`Начинаем генерацию ${chunksToGenerate.length} звуков...`);
    
    // Generate sequentially to avoid overloading
    for (const chunk of chunksToGenerate) {
      await generateAudio(chunk.id);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  // Play audio
  const playAudio = (audioUrl: string, chunkId: number) => {
    if (currentlyPlaying === chunkId) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentlyPlaying(null);
    } else {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Play new audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setCurrentlyPlaying(chunkId);
      
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Ошибка воспроизведения');
        setCurrentlyPlaying(null);
      });

      audio.onended = () => {
        setCurrentlyPlaying(null);
      };

      audio.onerror = () => {
        toast.error('Ошибка воспроизведения');
        setCurrentlyPlaying(null);
      };
    }
  };

  // Handle video upload for a chunk
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>, chunkId: number) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploaded = await uploadVideo(file);
      if (uploaded) {
        setChunks(prev => prev.map(c => 
          c.id === chunkId ? { ...c, videoFile: uploaded } : c
        ));
        toast.success(`Видео для звука ${chunkId} загружено`);
      }
    }
  };

  // Update text for a chunk
  const updateChunkText = (chunkId: number, text: string) => {
    setChunks(prev => prev.map(c => 
      c.id === chunkId ? { ...c, text: applyBrandReplacements(text) } : c
    ));
  };

  // Remove chunk
  const removeChunk = (chunkId: number) => {
    setChunks(prev => prev.filter(c => c.id !== chunkId));
  };

  // Add new chunk
  const addChunk = () => {
    if (chunks.length >= 10) {
      toast.error('Максимум 10 кусочков');
      return;
    }
    
    const newId = Math.max(...chunks.map(c => c.id), 0) + 1;
    setChunks(prev => [...prev, {
      id: newId,
      text: '',
      isGenerating: false
    }]);
  };

  // Calculate start times for all chunks based on their effective durations
  const calculateStartTimes = (chunks: AudioChunk[]): AudioChunk[] => {
    let currentTime = 0;
    
    return chunks.map((chunk) => {
      const updatedChunk = { ...chunk, startTime: currentTime };
      
      // Добавляем эффективную длительность к текущему времени для следующего чанка
      if (chunk.effectiveDuration) {
        currentTime += chunk.effectiveDuration;
      }
      
      return updatedChunk;
    });
  };

  // Load text blocks from Google Sheets
  const loadTextBlocks = async () => {
    if (!textTableId.trim()) {
      toast.error('Введите ID таблицы для текстовых блоков');
      return;
    }
    
    if (!textRowNumber.trim()) {
      toast.error('Введите номер строки для текстовых блоков');
      return;
    }

    const row = parseInt(textRowNumber);
    if (isNaN(row) || row < 1 || row > 1000) {
      toast.error('Номер строки должен быть от 1 до 1000');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: { 
          spreadsheetId: textTableId,
          rowNumber: row
        }
      });

      if (error) throw error;

      if (data.texts && data.texts.length > 0) {
        const limitedTexts = data.texts.slice(0, 10);
        setTextBlocks(limitedTexts);
        toast.success(`Загружено ${limitedTexts.length} текстовых блоков`);
      } else {
        toast.error('Текстовые блоки не найдены в таблице');
      }
    } catch (error: any) {
      console.error('Error loading text blocks:', error);
      toast.error(`Ошибка загрузки текстовых блоков: ${error.message}`);
    }
  };

  // Notify parent when data is ready
  const handleReady = () => {
    const readyChunks = chunks.filter(c => c.text.trim());
    if (readyChunks.length === 0) {
      toast.error('Добавьте хотя бы один текст');
      return;
    }
    onReady(readyChunks, textBlocks, useTextMode);
  };

  return (
    <div className="space-y-6">

      {/* Text Mode Selection */}
      <Card className="p-6 bg-video-surface border-video-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-video-primary" />
            <h3 className="text-lg font-semibold">Режим работы</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="audio-mode"
                name="mode"
                checked={!useTextMode}
                onChange={() => setUseTextMode(false)}
                className="rounded border-video-primary/30"
              />
              <label htmlFor="audio-mode" className="font-medium cursor-pointer">
                Режим с озвучкой и субтитрами
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="text-mode"
                name="mode"
                checked={useTextMode}
                onChange={() => setUseTextMode(true)}
                className="rounded border-video-primary/30"
              />
              <label htmlFor="text-mode" className="font-medium cursor-pointer">
                Текстовый режим (блоки по 2 секунды без озвучки)
              </label>
            </div>
            {useTextMode && (
              <div className="text-sm text-muted-foreground pl-6">
                В этом режиме каждый текстовый блок будет отображаться 2 секунды без озвучки и субтитров
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Google Sheets Integration */}
      <Card className="p-6 bg-video-surface border-video-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-video-primary" />
            <h3 className="text-lg font-semibold">Загрузка текстов из Google Sheets</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>ID таблицы Google Sheets</Label>
              <Input
                placeholder="ID таблицы Google Sheets..."
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
              />
            </div>
            <div>
              <Label>Номер строки (1-1000)</Label>
              <Input
                placeholder="Номер строки..."
                value={rowNumber}
                onChange={(e) => setRowNumber(e.target.value)}
                type="number"
                min="1"
                max="1000"
              />
            </div>
          </div>
          <Button 
            onClick={loadTexts}
            disabled={isLoadingTexts}
            className="bg-video-primary hover:bg-video-primary-hover w-full"
          >
            {isLoadingTexts ? 'Загрузка...' : 'Загрузить тексты из столбцов H-Q'}
          </Button>
        </div>
      </Card>

      {/* Text Blocks for Text Mode */}
      {useTextMode && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-video-primary" />
              <h3 className="text-lg font-semibold">Текстовые блоки (отдельная таблица)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label>ID таблицы для текстовых блоков</Label>
                <Input
                  placeholder="ID таблицы для текстовых блоков..."
                  value={textTableId}
                  onChange={(e) => setTextTableId(e.target.value)}
                />
              </div>
              <div>
                <Label>Номер строки (1-1000)</Label>
                <Input
                  placeholder="Номер строки..."
                  value={textRowNumber}
                  onChange={(e) => setTextRowNumber(e.target.value)}
                  type="number"
                  min="1"
                  max="1000"
                />
              </div>
            </div>
            <Button 
              onClick={loadTextBlocks}
              className="bg-video-primary hover:bg-video-primary-hover w-full"
            >
              Загрузить текстовые блоки
            </Button>
            
            {textBlocks.length > 0 && (
              <div className="space-y-2">
                <Label>Загруженные текстовые блоки:</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {textBlocks.map((text, index) => (
                    <div key={index} className="p-2 bg-video-surface-elevated rounded text-sm">
                      <span className="font-mono text-xs text-muted-foreground">Text-{index + 1}:</span> {text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Brand Replacement */}
      {texts.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-video-primary" />
              <h3 className="text-lg font-semibold">Быстрая замена брендов</h3>
            </div>
            
            <div className="space-y-3">
              <Label>Введите слово для замены и выберите бренд</Label>
              <div className="space-y-3">
                {Object.keys(brandReplacements).length > 0 ? (
                  Object.entries(brandReplacements).map(([original, replacement], index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Input
                          placeholder="Слово для замены"
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
                      <div className="ml-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {AVAILABLE_BRANDS.map(brand => (
                            <label key={brand.id} className="flex items-center space-x-2 cursor-pointer p-2 bg-video-surface-elevated rounded-lg hover:bg-video-surface-elevated/80 transition-colors">
                              <input
                                type="radio"
                                name={`replacement-${index}`}
                                checked={replacement === brand.name}
                                onChange={() => handleBrandToggle(brand.id, original)}
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
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setBrandReplacements(prev => ({ ...prev, '': '' }))}
                    variant="outline"
                    size="sm"
                  >
                    + Добавить замену
                  </Button>
                  
                  <Button
                    onClick={applyReplacementsToAllChunks}
                    className="bg-video-primary hover:bg-video-primary-hover"
                    size="sm"
                    disabled={Object.keys(brandReplacements).length === 0}
                  >
                    Применить изменения
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Voice Selection */}
      {texts.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-video-primary" />
              <h3 className="text-lg font-semibold">Выбор голоса</h3>
            </div>
            
            <div>
              <Label>Выберите голос для озвучки</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите голос" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_VOICES.filter(voice => voice.language === 'en').map(voice => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender === 'male' ? 'Мужской' : 'Женский'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Chunks Management */}
      {chunks.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-video-primary" />
                <h3 className="text-lg font-semibold">Звуки по кусочкам ({chunks.length}/10)</h3>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={generateAllAudio}
                  className="bg-video-primary hover:bg-video-primary-hover"
                  disabled={chunks.some(c => c.isGenerating)}
                >
                  Сгенерировать все звуки
                </Button>
                <Button 
                  onClick={addChunk}
                  variant="outline"
                  disabled={chunks.length >= 10}
                  className="border-video-primary/30"
                >
                  Добавить кусочек
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {chunks.map((chunk, index) => (
                <Card key={chunk.id} className="p-4 bg-video-surface-elevated">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-video-primary/30">
                        Звук {chunk.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChunk(chunk.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Text */}
                    <div>
                      <Label>Текст</Label>
                      <Textarea
                        placeholder="Введите текст для озвучки..."
                        value={chunk.text}
                        onChange={(e) => updateChunkText(chunk.id, e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Audio Generation */}
                    <div className="space-y-2">
                      <Button
                        onClick={() => generateAudio(chunk.id)}
                        disabled={chunk.isGenerating || !chunk.text.trim()}
                        className="bg-video-primary hover:bg-video-primary-hover w-full"
                        size="sm"
                      >
                        {chunk.isGenerating ? 'Генерация...' : 'Генерировать'}
                      </Button>
                      
                      {chunk.audioUrl && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => playAudio(chunk.audioUrl!, chunk.id)}
                            className="border-video-primary/30 flex-1"
                          >
                            {currentlyPlaying === chunk.id ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Стоп
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Играть
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAudio(chunk.id)}
                            disabled={chunk.isGenerating}
                            className="border-video-primary/30 px-3"
                            title="Перегенерировать"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Duration Info */}
                    {chunk.audioDuration && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Длительность: {chunk.audioDuration.toFixed(1)}с</div>
                        <div>Эффективная: {chunk.effectiveDuration?.toFixed(1)}с</div>
                        <div>Старт: {chunk.startTime?.toFixed(1)}с</div>
                      </div>
                    )}

                    {/* Video Upload */}
                    <div>
                      <Label>Видео для этого звука</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoUpload(e, chunk.id)}
                          className="hidden"
                          id={`video-upload-${chunk.id}`}
                        />
                        <label
                          htmlFor={`video-upload-${chunk.id}`}
                          className="flex items-center justify-center gap-2 px-3 py-2 border border-video-primary/30 rounded-md cursor-pointer hover:bg-video-primary/10 w-full text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          {chunk.videoFile ? 'Изменить' : 'Загрузить'}
                        </label>
                        {chunk.videoFile && (
                          <div className="flex items-center justify-center mt-2">
                            <div className="w-16 h-20 bg-video-surface-elevated rounded border border-video-primary/20 flex items-center justify-center overflow-hidden">
                              <video 
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                  // Set current time to get first frame
                                  e.currentTarget.currentTime = 0.1;
                                }}
                                onError={(e) => {
                                  console.error('Video preview error:', e);
                                  // Show fallback placeholder
                                  e.currentTarget.style.display = 'none';
                                }}
                              >
                                <source src={chunk.videoFile.url} type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {chunks.length > 0 && (
              <div className="pt-4 border-t border-video-primary/20">
                <Button 
                  onClick={handleReady}
                  className="bg-video-primary hover:bg-video-primary-hover"
                  size="lg"
                >
                  Готово к генерации
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ChunkedAudioScenario;