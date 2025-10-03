import React from 'react';
import { cn } from '@/lib/utils';
import { ImageUploader } from './ImageUploader';
import { Button } from '@/components/ui/button';
import { Crop, Edit } from 'lucide-react';

interface CharacterUploaderCardProps {
  title: string;
  isSelected: boolean;
  onClick: () => void;
  imageUrl: string | null;
  onImageChange: (file: File) => void;
  onReframe: () => void;
  onEdit: () => void;
}

export const CharacterUploaderCard: React.FC<CharacterUploaderCardProps> = ({
  title,
  isSelected,
  onClick,
  imageUrl,
  onImageChange,
  onReframe,
  onEdit
}) => {
  // Prevent button clicks from propagating to the card's onClick handler
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-2 rounded-lg border-2 transition-all duration-300 cursor-pointer flex flex-col gap-2',
        isSelected
          ? 'bg-zinc-900 border-zinc-700'
          : 'bg-transparent border-transparent'
      )}
    >
      <p className="text-center text-sm font-medium text-zinc-300">{title}</p>
      <div 
        onClick={(e) => { if (!imageUrl) e.stopPropagation(); }}
        className="aspect-[9/16] flex items-center justify-center"
      >
        <ImageUploader imageUrl={imageUrl} onImageChange={onImageChange} />
      </div>
      
      {isSelected && imageUrl && (
        <div className="mt-2 grid grid-cols-2 gap-2 animate-fade-in">
          <Button variant="outline" size="sm" onClick={(e) => handleButtonClick(e, onReframe)}>
            <Crop className="w-4 h-4 mr-2" />
            Reframe
          </Button>
          <Button variant="outline" size="sm" onClick={(e) => handleButtonClick(e, onEdit)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      )}
    </div>
  );
};
