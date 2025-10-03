import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';

interface DateEnvironmentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (environment: string) => void;
}

const environmentList = [
  "🎡 Amusement park",
  "🥡 Street food market",
  "🌳 Picnic in park",
  "🖼️ Modern art museum",
  "🕹️ Retro arcade hall",
  "🎶 Live music venue",
  "🏰 Historical castle",
  "🌌 Camping",
  "🎬 Outdoor cinema",
  "🐾 Pet café",
  "🛶 Lake with Paddle boat",
  "🌺 Tropical greenhouse",
  "🛍️ Vintage flea market",
  "🚂 Old train station turned cultural hub",
  "🎨 Independent art gallery",
  "🏖️ Beachside boardwalk",
  "🏙️ Old town district with hidden alleys",
  "🧩 Interactive science center",
  "🎭 Small theater or improv stage",
  "🌿 Hidden urban garden",
  "📕 Library"
];

export const DateEnvironmentModal: React.FC<DateEnvironmentModalProps> = ({ isOpen, onOpenChange, onConfirm }) => {
  const [selectedEnv, setSelectedEnv] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customEnv, setCustomEnv] = useState('');

  const handleConfirm = () => {
    if (isCustom && customEnv.trim()) {
      onConfirm(customEnv.trim());
    } else if (!isCustom && selectedEnv) {
      onConfirm(selectedEnv);
    }
  };
  
  const handleRandom = () => {
      const randomEnv = environmentList[Math.floor(Math.random() * environmentList.length)];
      setSelectedEnv(randomEnv);
      setIsCustom(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Date Environment</DialogTitle>
          <DialogDescription>
            Select an environment for your date scenes, or create your own.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-zinc-100">Suggestions</h3>
             <div>
                <Button variant="outline" size="sm" onClick={handleRandom} className="mr-2">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Random
                </Button>
                <Button variant={isCustom ? 'secondary' : 'outline'} size="sm" onClick={() => setIsCustom(!isCustom)}>
                    Custom
                </Button>
             </div>
          </div>
          
          {isCustom ? (
             <Input 
                value={customEnv}
                onChange={(e) => setCustomEnv(e.target.value)}
                placeholder="Describe your custom environment here..."
             />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {environmentList.map((env, index) => {
                const [emoji, ...textParts] = env.split(' ');
                const text = textParts.join(' ');
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedEnv(env);
                      setIsCustom(false);
                    }}
                    className={`p-3 text-center rounded-lg transition-colors flex flex-col items-center justify-center aspect-square ${selectedEnv === env && !isCustom ? 'bg-zinc-800 ring-2 ring-zinc-500' : 'bg-zinc-900 hover:bg-zinc-800'}`}
                  >
                    <span className="text-4xl" aria-hidden="true">{emoji}</span>
                    <p className="text-xs font-medium text-zinc-100 mt-2">{text}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isCustom ? !customEnv.trim() : !selectedEnv}>
            Confirm and Sketch Scenes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
