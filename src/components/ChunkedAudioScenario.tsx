import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Play, Pause, Upload, Trash2, FileText, Volume2, RefreshCw, Music } from 'lucide-react';
import { toast } from 'sonner';
import { useVideoUpload, UploadedVideo } from '@/hooks/useVideoUpload';
import { AVAILABLE_VOICES, VoiceOption } from '@/services/elevenLabsService';
import { AVAILABLE_BRANDS, AVAILABLE_MUSIC, CREATOMATE_TEMPLATES } from '@/services/creatomateService';
import { uploadMusicToStorage } from '@/utils/uploadMusic';

interface AudioChunk {
  id: number;
  text: string;
  audioUrl?: string;
  audioDuration?: number;
  effectiveDuration?: number; // Minimum 2 seconds or actual duration
  startTime?: number; // Start time on timeline
  isGenerating: boolean;
  videoFile?: UploadedVideo;
}

interface ChunkedAudioScenarioProps {
  onReady: (chunks: AudioChunk[], options?: { 
    textBlocks?: string[]; 
    customTextEnabled?: boolean;
    musicUrl?: string;
  }) => void;
  onBrandChange: (brands: string[]) => void;
}

const ChunkedAudioScenario: React.FC<ChunkedAudioScenarioProps> = ({ onReady, onBrandChange }) => {
  // Google Sheets
  const [tableId, setTableId] = useState('18fQlTTutBAtuS3NUCEGGmjou5wfw0nj_X3J8Kv88eMM');
  const [rowNumber, setRowNumber] = useState('');
  const [texts, setTexts] = useState<string[]>([]);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  
  // New state for controls
  const [customTextEnabled, setCustomTextEnabled] = useState(false);
  const [customTexts, setCustomTexts] = useState<string[]>([]);
  
  // Music file state
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState<string>('');
  
  // Voice selection
  const [selectedVoice, setSelectedVoice] = useState<string>('TX3LPaxmHKxFdv7VOQHJ'); // Liam voice by default
  
  // Brand selection (multiple brands can be selected)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  
  // Music selection
  const [selectedMusicId, setSelectedMusicId] = useState<string>('');
  const [musicAudio, setMusicAudio] = useState<HTMLAudioElement | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  // Upload music on first load (one-time)
  useEffect(() => {
    // Force re-upload for new music files (remove after first run)
    localStorage.removeItem('musicUploaded');
    
    const hasUploadedMusic = localStorage.getItem('musicUploaded');
    if (!hasUploadedMusic) {
      uploadMusicToStorage().then(() => {
        localStorage.setItem('musicUploaded', 'true');
      });
    }
  }, []);
  
  // Cleanup music audio on unmount
  useEffect(() => {
    return () => {
      if (musicAudio) {
        musicAudio.pause();
        musicAudio.src = '';
      }
    };
  }, [musicAudio]);
  
  // Audio controls
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { uploadVideo, isUploading } = useVideoUpload();


  // Load texts from Google Sheets
  const loadTexts = async () => {
    if (selectedBrands.length === 0) {
      toast.error('Please select at least one brand first');
      return;
    }

    if (!rowNumber.trim()) {
      toast.error('Please enter a row number');
      return;
    }

    const row = parseInt(rowNumber);
    if (isNaN(row) || row < 1 || row > 1000) {
      toast.error('Row number must be between 1 and 1000');
      return;
    }

    setIsLoadingTexts(true);
    try {
      const { googleSheetsService } = await import('@/services/googleSheetsService');
      const textBlock = await googleSheetsService.getTextBlock(row);
      
      if (!textBlock) {
        toast.error('Row not found in the spreadsheet');
        setIsLoadingTexts(false);
        return;
      }
      
      // Collect all non-empty text fields
      const collectedTexts = [
        textBlock.hook,
        textBlock.problem,
        textBlock.solution,
        textBlock.proof,
        textBlock.offer,
        textBlock.urgency,
        textBlock.cta,
        textBlock.bodyLine1,
        textBlock.bodyLine2,
        textBlock.bodyLine3,
        textBlock.bodyLine4,
        textBlock.bodyLine5,
        textBlock.bodyLine6,
        textBlock.bodyLine7,
        textBlock.bodyLine8,
        textBlock.bodyLine9,
      ].filter((text): text is string => !!text && text.trim() !== '');
      
      const data = { texts: collectedTexts };

      if (data.texts && data.texts.length > 0) {
        // Limit to 10 chunks maximum
        const limitedTexts = data.texts.slice(0, 10);
        setTexts(limitedTexts);
        
        // Apply brand replacements automatically
        const processedTexts = limitedTexts.map(text => applyBrandReplacements(text));
        
        // Initialize chunks with processed texts
        const initialChunks: AudioChunk[] = processedTexts.map((text, index) => ({
          id: index + 1,
          text: text,
          isGenerating: false
        }));
        
        setChunks(initialChunks);
        
        // Load custom texts with brand replacements applied
        setCustomTexts(processedTexts);
        
        toast.success(`Loaded ${limitedTexts.length} texts`);
      } else {
        toast.error('No texts found in the spreadsheet');
      }
    } catch (error: any) {
      console.error('Error loading texts:', error);
      toast.error(`Loading error: ${error.message}`);
    } finally {
      setIsLoadingTexts(false);
    }
  };

  // Apply brand replacements to text
  const applyBrandReplacements = (text: string): string => {
    if (selectedBrands.length === 0) return text;
    
    let processedText = text;
    
    // Get the first selected brand name for display
    const primaryBrand = AVAILABLE_BRANDS.find(b => b.id === selectedBrands[0]);
    if (!primaryBrand) return text;
    
    // Replace all brand mentions with the primary brand name
    // Common patterns to replace
    const brandPatterns = [
      'DateMyAge',
      'Date My Age',
      'OurLove',
      'Our Love',
      'EuroDate',
      'Euro Date',
      'DatingClub',
      'Dating Club',
    ];
    
    brandPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi');
      processedText = processedText.replace(regex, primaryBrand.name);
    });
    
    return processedText;
  };

  // Handle brand toggle
  const handleBrandToggle = (brandId: string) => {
    const newBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter(b => b !== brandId)
      : [...selectedBrands, brandId];
    
    setSelectedBrands(newBrands);
    onBrandChange(newBrands);

    // If we have loaded texts, reapply brand replacements
    if (texts.length > 0) {
      const processedTexts = texts.map(text => {
        if (newBrands.length === 0) return text;
        
        let processed = text;
        const primaryBrand = AVAILABLE_BRANDS.find(b => b.id === newBrands[0]);
        if (!primaryBrand) return text;
        
        const brandPatterns = [
          'DateMyAge', 'Date My Age',
          'OurLove', 'Our Love',
          'EuroDate', 'Euro Date',
          'DatingClub', 'Dating Club',
        ];
        
        brandPatterns.forEach(pattern => {
          const regex = new RegExp(pattern, 'gi');
          processed = processed.replace(regex, primaryBrand.name);
        });
        
        return processed;
      });
      
      setChunks(prev => prev.map((chunk, index) => ({
        ...chunk,
        text: processedTexts[index] || chunk.text
      })));
      
      setCustomTexts(processedTexts);
    }
  };

  // Generate audio for a specific chunk
  const generateAudio = async (chunkId: number) => {
    const chunk = chunks.find(c => c.id === chunkId);
    if (!chunk || !chunk.text.trim()) {
      toast.error('Text is empty');
      return;
    }

    setChunks(prev => prev.map(c => 
      c.id === chunkId ? { ...c, isGenerating: true } : c
    ));

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      console.log('Generating audio for chunk:', chunkId);
      console.log('Text:', chunk.text);
      console.log('Voice:', selectedVoice);

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: {
          text: chunk.text,
          voiceId: selectedVoice
        }
      });

      if (error) {
        console.error('ElevenLabs error:', error);
        throw new Error(error.message || 'Failed to generate audio');
      }

      if (!data || !data.audioUrl) {
        throw new Error('No audio data received');
      }

      console.log('Audio generated successfully, duration:', data.duration);

      // Calculate effective duration (minimum 2 seconds)
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
        
        // Recalculate start times for all chunks
        return calculateStartTimes(updatedChunks);
      });

      toast.success(`Audio ${chunkId} ready (${data.duration?.toFixed(1)}s, effective: ${effectiveDuration.toFixed(1)}s)`);
    } catch (error: any) {
      console.error('Error generating audio:', error);
      toast.error(`Audio generation error: ${error.message}`);
      setChunks(prev => prev.map(c => 
        c.id === chunkId ? { ...c, isGenerating: false } : c
      ));
    }
  };

  // Generate all audio chunks
  const generateAllAudio = async () => {
    const chunksToGenerate = chunks.filter(c => c.text.trim() && !c.audioUrl);
    if (chunksToGenerate.length === 0) {
      toast.error('No texts to generate');
      return;
    }

    toast.success(`Starting generation of ${chunksToGenerate.length} audio files...`);
    
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
        toast.error('Playback error');
        setCurrentlyPlaying(null);
      });

      audio.onended = () => {
        setCurrentlyPlaying(null);
      };

      audio.onerror = () => {
        toast.error('Playback error');
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
        toast.success(`Video for audio ${chunkId} uploaded`);
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
      toast.error('Maximum 10 chunks');
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
      
      // Add effective duration to current time for the next chunk
      if (chunk.effectiveDuration) {
        currentTime += chunk.effectiveDuration;
      }
      
      return updatedChunk;
    });
  };

  // Notify parent when data is ready
  const handleReady = () => {
    const readyChunks = chunks.filter(c => c.text.trim());
    if (readyChunks.length === 0) {
      toast.error('Add at least one text');
      return;
    }
    
    // Get selected music URL
    const musicUrl = selectedMusicId 
      ? AVAILABLE_MUSIC.find(m => m.id === selectedMusicId)?.url 
      : '';
    
    // Prepare text blocks, filling empty slots with spaces for chunks 8-10
    const textBlocks = customTextEnabled ? customTexts : chunks.map(chunk => chunk.text || '').slice(0, 10);
    const paddedTextBlocks = [...textBlocks];
    
    // Fill remaining slots (8-10) with spaces if we have fewer than 10 text blocks
    while (paddedTextBlocks.length < 10) {
      paddedTextBlocks.push(' ');
    }
    
    onReady(readyChunks, {
      textBlocks: paddedTextBlocks,
      customTextEnabled,
      musicUrl
    });
  };

  return (
    <div className="space-y-6">
      {/* Brand Selection */}
      <Card className="p-6 bg-video-surface border-video-primary/20">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-video-primary" />
            <h3 className="text-lg font-semibold">Brand Selection</h3>
          </div>
          
          <div className="space-y-3">
            <Label>Select brands for automatic replacement in texts and packshots:</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_BRANDS.map(brand => {
                const isSelected = selectedBrands.includes(brand.id);
                
                return (
                  <label 
                    key={brand.id} 
                    className={`flex items-center space-x-2 cursor-pointer p-4 rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-video-primary/20 border-2 border-video-primary' 
                        : 'bg-video-surface-elevated border-2 border-transparent hover:border-video-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleBrandToggle(brand.id)}
                    />
                    <span className="text-sm font-medium">{brand.name}</span>
                  </label>
                );
              })}
            </div>
            
            {selectedBrands.length > 1 && (
              <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-sm text-info">
                ⚠️ Warning: {selectedBrands.length} brands selected. Text will be shown with {AVAILABLE_BRANDS.find(b => b.id === selectedBrands[0])?.name} replacement, but during rendering versions will be automatically created for all selected brands.
              </div>
            )}
            
            {selectedBrands.length === 0 && (
              <div className="p-3 bg-muted/50 border border-muted rounded-lg text-sm text-muted-foreground">
                Select at least one brand to continue
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
            <h3 className="text-lg font-semibold">
              Load texts from{' '}
              <a 
                href="https://docs.google.com/spreadsheets/d/18fQlTTutBAtuS3NUCEGGmjou5wfw0nj_X3J8Kv88eMM/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-video-primary hover:underline"
              >
                Google Sheets
              </a>
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Google Sheets table ID</Label>
              <Input
                placeholder="Google Sheets table ID..."
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
              />
            </div>
            <div>
              <Label>Row number (1-1000)</Label>
              <Input
                placeholder="Row number..."
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
            disabled={isLoadingTexts || selectedBrands.length === 0}
            className="bg-video-primary hover:bg-video-primary-hover w-full"
          >
            {isLoadingTexts ? 'Loading...' : 'Load texts from columns H-Q'}
          </Button>
        </div>
      </Card>

      {/* Voice Selection */}
      {texts.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-video-primary" />
              <h3 className="text-lg font-semibold">Voice Selection</h3>
            </div>
            
            <div>
              <Label>Select voice for voiceover</Label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger>
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_VOICES.filter(voice => voice.language === 'en').map(voice => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender === 'male' ? 'Male' : 'Female'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Music Selection */}
      {texts.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-video-primary" />
              <h3 className="text-lg font-semibold">Music Selection</h3>
            </div>
            
            <div>
              <Label>Select music track</Label>
              <div className="flex gap-2">
                <Select value={selectedMusicId} onValueChange={setSelectedMusicId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select track..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_MUSIC.map(track => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMusicId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (isMusicPlaying && musicAudio) {
                        // Pause music
                        musicAudio.pause();
                        setIsMusicPlaying(false);
                      } else {
                        // Play music
                        const track = AVAILABLE_MUSIC.find(m => m.id === selectedMusicId);
                        if (track) {
                          // Stop previous audio if exists
                          if (musicAudio) {
                            musicAudio.pause();
                            musicAudio.src = '';
                          }
                          
                          const audio = new Audio(track.url);
                          audio.addEventListener('ended', () => setIsMusicPlaying(false));
                          audio.play().catch(error => {
                            console.error('Error playing music:', error);
                            toast.error('Music playback error');
                            setIsMusicPlaying(false);
                          });
                          
                          setMusicAudio(audio);
                          setIsMusicPlaying(true);
                        }
                      }
                    }}
                    className="border-video-primary/30"
                  >
                    {isMusicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {selectedMusicId && (
                <div className="mt-2 p-2 bg-video-surface-elevated rounded text-xs text-muted-foreground">
                  Selected track: {AVAILABLE_MUSIC.find(m => m.id === selectedMusicId)?.name}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Tracks are stored in public/music/. Add your files and update AVAILABLE_MUSIC in creatomateService.ts
              </p>
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
                <h3 className="text-lg font-semibold">Audio Chunks ({chunks.length}/10)</h3>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={generateAllAudio}
                  className="bg-video-primary hover:bg-video-primary-hover"
                  disabled={chunks.some(c => c.isGenerating)}
                >
                  Generate All Audio
                </Button>
                <Button 
                  onClick={addChunk}
                  variant="outline"
                  disabled={chunks.length >= 10}
                  className="border-video-primary/30"
                >
                  Add Chunk
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {chunks.map((chunk, index) => (
                <Card key={chunk.id} className="p-4 bg-video-surface-elevated">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="border-video-primary/30">
                        Audio {chunk.id}
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
                      <Label>Text</Label>
                      <Textarea
                        placeholder="Enter text for voiceover..."
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
                        {chunk.isGenerating ? 'Generating...' : 'Generate'}
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
                                Stop
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Play
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateAudio(chunk.id)}
                            disabled={chunk.isGenerating}
                            className="border-video-primary/30 px-3"
                            title="Regenerate"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Duration Info */}
                    {chunk.audioDuration && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Duration: {chunk.audioDuration.toFixed(1)}s</div>
                        <div>Effective: {chunk.effectiveDuration?.toFixed(1)}s</div>
                        <div>Start: {chunk.startTime?.toFixed(1)}s</div>
                      </div>
                    )}

                    {/* Video Upload */}
                    <div>
                      <Label>Video for this audio</Label>
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
                          {chunk.videoFile ? 'Change' : 'Upload'}
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
                  Ready to Generate
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Custom Text */}
      {chunks.length > 0 && (
        <Card className="p-6 bg-video-surface border-video-primary/20">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="custom-text" 
                checked={customTextEnabled} 
                onCheckedChange={(checked) => setCustomTextEnabled(checked === true)}
              />
              <Label htmlFor="custom-text" className="text-sm font-medium">Custom Text</Label>
            </div>
            
            {customTextEnabled && (
              <div className="space-y-2 p-4 border rounded-lg">
                <Label className="text-sm text-muted-foreground">
                  Edit text blocks (maximum 10)
                </Label>
                {customTexts.slice(0, 10).map((text, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Block {index + 1}</Label>
                    <Textarea
                      value={text}
                      onChange={(e) => {
                        const newTexts = [...customTexts];
                        newTexts[index] = e.target.value;
                        setCustomTexts(newTexts);
                      }}
                      placeholder={`Text for block ${index + 1}`}
                      className="min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ChunkedAudioScenario;