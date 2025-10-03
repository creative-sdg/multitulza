

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

const model = {
  id: 'nano-banana' as ImageGenerationModel,
  name: 'Gemini Nano Banana',
  description: 'Modifies the source character image based on the prompt.',
  pricePerImage: 0.04
};

export const ImageModelSelectionModal: React.FC<ImageModelSelectionModalProps> = ({ isOpen, onOpenChange, onSelectModel, numberOfImages }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Image Generation</DialogTitle>
          <DialogDescription>
            You are about to generate {numberOfImages} image{numberOfImages > 1 ? 's' : ''}. Please review the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Card key={model.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                  <CardTitle className="text-lg">{model.name}</CardTitle>
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSelectModel(model.id)}>Confirm & Generate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
