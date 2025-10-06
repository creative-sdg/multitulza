

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ImageGenerationModel } from '@/types/conjuring';

interface ImageModelSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectModel: (model: ImageGenerationModel) => void;
  numberOfImages: number;
}

const models = [
  {
    id: 'nano-banana' as ImageGenerationModel,
    name: 'Gemini Nano Banana',
    description: 'Modifies the source character image based on the prompt. Fast and efficient.',
    pricePerImage: 0.04
  },
  {
    id: 'seedream' as ImageGenerationModel,
    name: 'Seedream V3',
    description: 'High-quality image generation from text. More creative but slower.',
    pricePerImage: 0.06
  }
];

export const ImageModelSelectionModal: React.FC<ImageModelSelectionModalProps> = ({ isOpen, onOpenChange, onSelectModel, numberOfImages }) => {
  const [selectedModel, setSelectedModel] = React.useState<ImageGenerationModel>('nano-banana');

  if (!isOpen) {
    return null;
  }

  const currentModel = models.find(m => m.id === selectedModel)!;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Model & Confirm Generation</DialogTitle>
          <DialogDescription>
            You are about to generate {numberOfImages} image{numberOfImages > 1 ? 's' : ''}. Choose a model and review pricing.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {models.map((model) => (
            <Card 
              key={model.id} 
              className={`cursor-pointer transition-all ${
                selectedModel === model.id 
                  ? 'bg-zinc-800 border-zinc-600 ring-2 ring-zinc-500' 
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={() => setSelectedModel(model.id)}
            >
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedModel === model.id ? 'border-zinc-400' : 'border-zinc-600'
                  }`}>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 rounded-full bg-zinc-400" />
                    )}
                  </div>
                  {model.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {`$${model.pricePerImage.toFixed(2)} / image`}
                  {numberOfImages >= 1 && (
                    <span className="text-zinc-400">
                      {` (Est. total: `}
                      <span className="font-bold text-zinc-200">
                        {`$${(model.pricePerImage * numberOfImages).toFixed(2)}`}
                      </span>
                      {`)`}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400">{model.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSelectModel(selectedModel)}>
            Confirm & Generate with {currentModel.name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
