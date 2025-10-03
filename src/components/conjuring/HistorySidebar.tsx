
import React, { useState, useEffect } from 'react';
import type { HistoryItem } from '@/types/conjuring';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Menu, Trash2, WandSparkles } from 'lucide-react';
import { getImage } from '@/services/conjuring/storageService';
import { calculateHistoryItemCost } from '@/services/conjuring/costService';

const TEXT_TO_IMAGE_HISTORY_ID = 'text-to-image-generations';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelectItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
}

const HistoryListItem: React.FC<{
    item: HistoryItem;
    onSelect: (item: HistoryItem) => void;
}> = ({ item, onSelect }) => {
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const [totalCost, setTotalCost] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        if (item.id !== TEXT_TO_IMAGE_HISTORY_ID) {
            const cost = calculateHistoryItemCost(item);
            if (isMounted) {
                setTotalCost(cost.toFixed(2));
            }
        } else {
             if (isMounted) {
                setTotalCost(null);
             }
        }
        
        if (item.id === TEXT_TO_IMAGE_HISTORY_ID) {
            if (isMounted) setThumbUrl(null);
            return;
        };

        const loadThumb = async () => {
            try {
                const blob = await getImage(item.imageId);
                if (blob && isMounted) {
                    const objectUrl = URL.createObjectURL(blob);
                    setThumbUrl(objectUrl);
                }
            } catch (e) {
                console.error("Failed to load thumbnail for history", e);
            }
        };

        loadThumb();

        return () => {
            isMounted = false;
            if (thumbUrl) {
                URL.revokeObjectURL(thumbUrl);
            }
        };
    }, [item]);

    const content = (
        <div className="overflow-hidden">
            <p className="text-sm font-semibold text-zinc-200 truncate">{item.characterProfile.name}</p>
            <p className="text-xs text-zinc-400 mt-1 truncate">{item.characterProfile.personality}</p>
            <p className="text-xs text-zinc-500 mt-1">{new Date(item.timestamp).toLocaleString()}</p>
            {totalCost !== null && parseFloat(totalCost) > 0 && (
                <p className="text-xs text-zinc-500 mt-1">Total cost: ${totalCost}</p>
            )}
        </div>
    );

    if (item.id === TEXT_TO_IMAGE_HISTORY_ID) {
        return (
            <button
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-4 p-3 text-left hover:bg-zinc-900 transition-colors focus:outline-none focus:bg-zinc-900 ring-zinc-600 focus-visible:ring-1"
            >
                <div className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-zinc-800 flex items-center justify-center">
                    <WandSparkles className="w-8 h-8 text-zinc-400" />
                </div>
                {content}
            </button>
        );
    }


    return (
        <button
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-4 p-3 text-left hover:bg-zinc-900 transition-colors focus:outline-none focus:bg-zinc-900 ring-zinc-600 focus-visible:ring-1"
        >
            <img 
                src={thumbUrl || ''}
                alt="Character" 
                className="w-16 h-16 rounded-md object-cover flex-shrink-0 bg-zinc-800" 
            />
            {content}
        </button>
    );
};

export const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelectItem, onDeleteItem }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = useState<HistoryItem | null>(null);


  const handleSelect = (item: HistoryItem) => {
    onSelectItem(item);
    setIsOpen(false);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    }
  };

  return (
    <>
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger>
        <Button variant="outline" size="icon" aria-label="Open history menu">
            <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm bg-zinc-950 border-zinc-800 text-zinc-50 p-0">
        <SheetHeader className="p-4 border-b border-zinc-800">
          <SheetTitle>History</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100%-4.5rem)]">
          {history.length === 0 ? (
            <p className="text-center text-zinc-500 p-6">No generations yet. Create a character to see it here!</p>
          ) : (
            <ul>
              {history.map((item) => (
                <li key={item.id} className="border-b border-zinc-800 flex items-center justify-between">
                  <HistoryListItem item={item} onSelect={handleSelect} />
                  <Button
                    onClick={() => setItemToDelete(item)}
                    variant="ghost"
                    size="icon"
                    className="mr-2 flex-shrink-0 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    aria-label={`Delete ${item.characterProfile.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
    
    <Dialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Delete History Item?</DialogTitle>
                <DialogDescription>
                    This will permanently delete the item for "{itemToDelete?.characterProfile.name}". This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button variant="outline" onClick={() => setItemToDelete(null)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
};
