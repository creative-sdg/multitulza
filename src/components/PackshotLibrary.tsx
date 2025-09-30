import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { usePackshotLibrary, PackshotFile } from '@/hooks/usePackshotLibrary';
import { Progress } from '@/components/ui/progress';

interface PackshotLibraryProps {
  onSelect?: (packshot: PackshotFile) => void;
  selectedPackshotUrl?: string;
}

export const PackshotLibrary: React.FC<PackshotLibraryProps> = ({ 
  onSelect,
  selectedPackshotUrl 
}) => {
  const { packshots, isLoading, uploadProgress, uploadPackshot, deletePackshot } = usePackshotLibrary();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPackshot(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="p-6 bg-video-surface border-video-primary/20">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-video-primary" />
            <h3 className="text-lg font-semibold">Библиотека Packshots</h3>
            <Badge variant="secondary">{packshots.length}</Badge>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            size="sm"
            className="bg-video-primary hover:bg-video-primary-hover"
          >
            <Upload className="h-4 w-4 mr-2" />
            Загрузить
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-2">
            <Label>Загрузка...</Label>
            <Progress value={uploadProgress} />
          </div>
        )}

        {isLoading && packshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка библиотеки...
          </div>
        ) : packshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет загруженных packshots</p>
            <p className="text-sm">Загрузите видео или изображения</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {packshots.map((packshot) => (
              <div
                key={packshot.path}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedPackshotUrl === packshot.url
                    ? 'border-video-primary shadow-lg shadow-video-primary/20'
                    : 'border-transparent hover:border-video-primary/50'
                }`}
                onClick={() => onSelect?.(packshot)}
              >
                <div className="aspect-video bg-black/20 flex items-center justify-center">
                  {packshot.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img 
                      src={packshot.url} 
                      alt={packshot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video 
                      src={packshot.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                </div>
                
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePackshot(packshot.path);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-xs text-white truncate">{packshot.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
