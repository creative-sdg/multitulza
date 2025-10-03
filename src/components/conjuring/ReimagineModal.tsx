import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ActivityLists, ActivityCategory } from '@/types/conjuring';

interface ReimagineModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activityLists: ActivityLists;
  onSelectActivity: (activity: string) => void;
}

const categoryEmojis: Record<ActivityCategory, string> = {
  'Sports activities': '⚽️',
  'Artistic activities': '🎨',
  'Lifestyle & relaxation': '🧘',
  'Daily life': '🏠',
  'Original experiences': '✨',
  'Romantic Activities': '💕',
  'Date Activities': '🥂',
  'Couple Activities': '👩🏼‍🤝‍👨🏻'
};

export const ReimagineModal: React.FC<ReimagineModalProps> = ({ isOpen, onOpenChange, activityLists, onSelectActivity }) => {
  if (!isOpen) return null;

  const handleSelect = (activity: string) => {
    onSelectActivity(activity);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Reimagine with a New Activity</DialogTitle>
          <DialogDescription>
            Select a new activity to generate a fresh take on this scene.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6">
          {(Object.keys(activityLists) as ActivityCategory[]).map(category => (
            activityLists[category].length > 0 && (
              <div key={category}>
                <h3 className="text-lg font-semibold text-zinc-100 mb-3">
                  {categoryEmojis[category]} {category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activityLists[category].map((activity, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelect(activity)}
                      className="text-left justify-start h-auto py-1.5"
                    >
                      {activity}
                    </Button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
