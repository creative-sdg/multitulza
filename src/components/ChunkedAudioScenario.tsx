import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Upload, Trash2, FileText, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useVideoUpload, UploadedVideo } from '@/hooks/useVideoUpload';

interface AudioChunk {
  id: number;
  text: string;
  audioUrl?: string;
  isGenerating: boolean;
  videoFile?: UploadedVideo;
}

interface ChunkedAudioScenarioProps {
  onReady: (chunks: AudioChunk[]) => void;
}

const ChunkedAudioScenario: React.FC<ChunkedAudioScenarioProps> = ({ onReady }) => {
  const [tableId, setTableId] = useState('');
  const [texts, setTexts] = useState<string[]>([]);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { uploadVideo, isUploading } = useVideoUpload();

  // Load texts from Google Sheets
  const loadTexts = async () => {
    if (!tableId.trim()) {
      toast.error('Введите ID таблицы');
      return;
    }

    setIsLoadingTexts(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-sheets', {
        body: { spreadsheetId: tableId }
      });

      if (error) throw error;

      if (data.texts && data.texts.length > 0) {
        // Limit to 10 chunks maximum
        const limitedTexts = data.texts.slice(0, 10);
        setTexts(limitedTexts);
        
        // Initialize chunks
        const initialChunks: AudioChunk[] = limitedTexts.map((text, index) => ({
          id: index + 1,
          text,
          isGenerating: false
        }));
        
        setChunks(initialChunks);
        toast.success(`Загружено ${limitedTexts.length} текстов`);
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
          voiceId: '9BWtsMINqrJLrRacOk9x' // Aria voice
        }
      });

      if (error) throw error;

      setChunks(prev => prev.map(c => 
        c.id === chunkId 
          ? { ...c, audioUrl: data.audioUrl, isGenerating: false }
          : c
      ));

      toast.success(`Звук ${chunkId} готов`);
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
      c.id === chunkId ? { ...c, text } : c
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

  // Notify parent when data is ready
  const handleReady = () => {
    const readyChunks = chunks.filter(c => c.text.trim());
    if (readyChunks.length === 0) {
      toast.error('Добавьте хотя бы один текст');
      return;
    }
    onReady(readyChunks);
  };

  return (
    <div className="space-y-6">
      {/* Google Sheets Integration */}
      <Card className="p-6 bg-video-surface border-video-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-video-primary" />
            <h3 className="text-lg font-semibold">Загрузка текстов из Google Sheets</h3>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="ID таблицы Google Sheets..."
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
              />
            </div>
            <Button 
              onClick={loadTexts}
              disabled={isLoadingTexts}
              className="bg-video-primary hover:bg-video-primary-hover"
            >
              {isLoadingTexts ? 'Загрузка...' : 'Загрузить тексты'}
            </Button>
          </div>
        </div>
      </Card>

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

            <div className="space-y-4">
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
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => generateAudio(chunk.id)}
                        disabled={chunk.isGenerating || !chunk.text.trim()}
                        className="bg-video-primary hover:bg-video-primary-hover"
                      >
                        {chunk.isGenerating ? 'Генерация...' : 'Сгенерировать звук'}
                      </Button>
                      
                      {chunk.audioUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playAudio(chunk.audioUrl!, chunk.id)}
                          className="border-video-primary/30"
                        >
                          {currentlyPlaying === chunk.id ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

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
                          className="flex items-center gap-2 px-4 py-2 border border-video-primary/30 rounded-md cursor-pointer hover:bg-video-primary/10"
                        >
                          <Upload className="h-4 w-4" />
                          {chunk.videoFile ? 'Изменить видео' : 'Загрузить видео'}
                        </label>
                        {chunk.videoFile && (
                          <Badge variant="outline" className="border-success/30 text-success">
                            {chunk.videoFile.file.name}
                          </Badge>
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