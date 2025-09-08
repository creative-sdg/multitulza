import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Play, Pause, Scissors } from 'lucide-react';

interface VideoTimelineProps {
  videoUrl: string;
  duration: number;
  onTimeRangeChange: (startTime: number, endTime: number) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({ 
  videoUrl, 
  duration, 
  onTimeRangeChange 
}) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEndTime(duration);
    onTimeRangeChange(startTime, duration);
  }, [duration]);

  useEffect(() => {
    onTimeRangeChange(startTime, endTime);
  }, [startTime, endTime, onTimeRangeChange]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      const rect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      handleSeek(Math.max(0, Math.min(duration, newTime)));
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = (time % 60).toFixed(1);
    return `${minutes}:${seconds.padStart(4, '0')}`;
  };

  const handleStartTimeChange = (value: string) => {
    const time = Math.max(0, Math.min(endTime - 0.1, parseFloat(value) || 0));
    setStartTime(time);
  };

  const handleEndTimeChange = (value: string) => {
    const time = Math.max(startTime + 0.1, Math.min(duration, parseFloat(value) || duration));
    setEndTime(time);
  };

  return (
    <Card className="p-6 bg-video-surface border-video-primary/20">
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <Scissors className="h-6 w-6 text-video-primary" />
          <h3 className="text-xl font-semibold">Обрезка видео</h3>
        </div>

        {/* Video Preview */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-48 object-contain"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
          />
          
          {/* Play/Pause Button */}
          <Button
            onClick={togglePlay}
            className="absolute bottom-4 left-4 bg-black/50 hover:bg-black/70"
            size="sm"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          
          {/* Time Display */}
          <div className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded text-sm text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <div
            ref={timelineRef}
            className="relative h-8 bg-video-surface-elevated rounded cursor-pointer"
            onClick={handleTimelineClick}
          >
            {/* Full timeline */}
            <div className="absolute inset-0 bg-muted rounded" />
            
            {/* Selected range */}
            <div
              className="absolute h-full bg-video-primary/30 rounded"
              style={{
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`,
              }}
            />
            
            {/* Current time indicator */}
            <div
              className="absolute top-0 w-0.5 h-full bg-video-primary"
              style={{
                left: `${(currentTime / duration) * 100}%`,
              }}
            />
            
            {/* Start marker */}
            <div
              className="absolute top-0 w-2 h-full bg-video-primary rounded-l cursor-ew-resize"
              style={{
                left: `${(startTime / duration) * 100}%`,
              }}
            />
            
            {/* End marker */}
            <div
              className="absolute top-0 w-2 h-full bg-video-primary rounded-r cursor-ew-resize"
              style={{
                left: `${(endTime / duration) * 100}%`,
                transform: 'translateX(-100%)',
              }}
            />
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Начало (сек)</Label>
              <Input
                id="start-time"
                type="number"
                step="0.1"
                min="0"
                max={endTime - 0.1}
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="bg-video-surface-elevated border-video-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Конец (сек)</Label>
              <Input
                id="end-time"
                type="number"
                step="0.1"
                min={startTime + 0.1}
                max={duration}
                value={endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="bg-video-surface-elevated border-video-primary/30"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime(0.5);
                setEndTime(duration - 4);
              }}
              className="text-xs"
            >
              Обрезать 0.5с начало, 4с конец
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime(0);
                setEndTime(duration);
              }}
              className="text-xs"
            >
              Сбросить
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Итоговая длительность: {formatTime(endTime - startTime)}
          </div>
        </div>
      </div>
    </Card>
  );
};