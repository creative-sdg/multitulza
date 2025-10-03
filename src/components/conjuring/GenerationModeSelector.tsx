import React from 'react';
import { cn } from '@/lib/utils';
import type { GenerationMode } from '@/types/conjuring';

interface ModeSelectorProps {
  selectedMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
}

const modes = [
  {
    id: 'normal' as GenerationMode,
    icon: '🧍🏻‍♂️',
    title: 'Normal Mode',
    description: 'Generates a variety of classic scenes based on your settings in the Activities tab.'
  },
  {
    id: 'selfie' as GenerationMode,
    icon: '🤳',
    title: 'Selfie Mode',
    description: 'Generates scenes as if the character is taking a selfie.'
  },
  {
    id: 'romantic' as GenerationMode,
    icon: '💕',
    title: 'Romantic Mode',
    description: 'Generates 9 romantic scenes from a female POV. A sincere, emotional atmosphere.'
  },
  {
    id: 'date' as GenerationMode,
    icon: '🥂',
    title: 'Date Mode',
    description: 'Like Romantic Mode, but all scenes have a coherent style as if they happened on the same day.'
  },
  {
    id: 'couple' as GenerationMode,
    icon: '👩🏼‍🤝‍👨🏻',
    title: 'Couple Mode',
    description: 'Generates scenes featuring the character with a partner, based on couple activities.'
  }
];

export const GenerationModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onModeChange }) => {
  const selectedModeDetails = modes.find(m => m.id === selectedMode);
  const animationKey = selectedModeDetails ? selectedModeDetails.id : 'empty';

  const getThumbStyle = () => {
    const index = modes.findIndex(m => m.id === selectedMode);
    if (index === -1) return {};

    const numModes = modes.length;
    const thumbWidthRem = 2;
    const halfThumbWidthRem = thumbWidthRem / 2;

    const span = `(100% - ${thumbWidthRem}rem)`;
    
    const travelPercentage = index / (numModes - 1);

    return {
        left: `calc(${halfThumbWidthRem}rem + ${span} * ${travelPercentage})`,
        transform: 'translateX(-50%)',
    };
  };

  return (
    <div className="w-full max-w-sm mx-auto mt-6">
      <div className="relative h-8 flex justify-between items-center">
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-zinc-800 -translate-y-1/2" />

        <div
          style={getThumbStyle()}
          className="absolute top-0 w-8 h-8 bg-white rounded-full transition-all duration-300 ease-in-out"
        />

        {modes.map((mode) => (
          <div key={mode.id} className="relative z-10 w-8 h-8">
            <input
              type="radio"
              id={`mode-${mode.id}`}
              name="generation-mode"
              value={mode.id}
              checked={selectedMode === mode.id}
              onChange={() => onModeChange(mode.id)}
              className="sr-only"
            />
            <label
              htmlFor={`mode-${mode.id}`}
              className="w-full h-full flex items-center justify-center cursor-pointer"
              aria-label={mode.title}
            >
              <span className={cn(
                'text-2xl transition-transform duration-300',
                selectedMode === mode.id ? 'scale-100 text-black' : 'scale-75 text-white'
              )}>
                {mode.icon}
              </span>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center min-h-[60px] px-4 overflow-hidden">
        {selectedModeDetails && (
          <div key={animationKey} className="animate-fade-in">
            <h3 className="font-semibold text-zinc-100">{selectedModeDetails.title}</h3>
            <p className="text-sm text-zinc-400 mt-1">{selectedModeDetails.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
