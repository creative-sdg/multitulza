
import React from 'react';
import { cn } from '@/lib/utils';
import type { GenerationStyle } from '@/types/conjuring';

interface StyleSelectorProps {
  selectedStyle: GenerationStyle;
  onStyleChange: (style: GenerationStyle) => void;
}

const styles = [
  { id: 'ugc' as GenerationStyle, label: 'UGC' },
  { id: 'cinematic' as GenerationStyle, label: 'Cinematic' },
];

export const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleChange }) => {
  return (
    <div className="w-full bg-zinc-900 p-1 rounded-lg grid grid-cols-2 gap-1">
      {styles.map((style) => (
        <button
          key={style.id}
          onClick={() => onStyleChange(style.id)}
          className={cn(
            'px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-600 focus-visible:ring-offset-2 ring-offset-black',
            selectedStyle === style.id
              ? 'bg-zinc-700 text-white'
              : 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          {style.label}
        </button>
      ))}
    </div>
  );
};
