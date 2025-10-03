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

interface GenerateAllModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectModel: (model: ImageGenerationModel) => void;
}

const model = {
  id: 'nano-banana' as ImageGenerationModel,
  name: 'Gemini Nano Banana',
  description: 'This will edit the source character image for each of the 9 scenes based on their prompts. This action will start 9 background jobs and cannot be undone.',
  price: '$0.04 / image',
  totalPrice: '$0.36'
};

export const GenerateAllModal: React.FC<GenerateAllModalProps> = ({ isOpen, onOpenChange, onSelectModel }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm: Generate All 9 Scenes</DialogTitle>
          <DialogDescription>
            You are about to generate images for all 9 scenes. Please review the details below.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Card key={model.id} className="bg-zinc-900 border-zinc-800">
            <CardHeader>
                <CardTitle className="text-lg">{model.name}</CardTitle>
                <CardDescription className="mt-1">
                  {model.price} (Est. total for 9 scenes: <span className="font-bold text-zinc-200">{model.totalPrice}</span>)
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
