import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crop, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { reframeImageFal, type FalAspectRatio } from '@/services/conjuring/falService';
import { dataUrlToBlob } from '@/utils/conjuring/fileUtils';

interface ImageCropperModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string | null;
  onCropComplete: (croppedImageUrl: string) => Promise<void>;
  onCancel: () => void;
  onAiReframeComplete: (newImageUrl: string) => void;
}

const aspectRatios = [
  { name: '9:16', value: 9 / 16 },
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4 / 3 },
  { name: '16:9', value: 16 / 9 },
  { name: 'Original', value: null },
];

const aiAspectRatios: FalAspectRatio[] = ['9:16', '16:9', '1:1', '4:3', '3:4', '21:9', '9:21'];


const MIN_CROP_SIZE_PX = 40; // Minimum crop size in screen pixels

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RenderedRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Action = 'move' | 'resize' | null;
type Corner = 'tl' | 'tr' | 'bl' | 'br';

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onOpenChange, imageUrl, onCropComplete, onCancel, onAiReframeComplete }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [crop, setCrop] = useState<CropRect | null>(null);
  const [activeAspectRatioName, setActiveAspectRatioName] = useState<string>('9:16');
  
  const [action, setAction] = useState<Action>(null);
  const [activeCorner, setActiveCorner] = useState<Corner | null>(null);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, cropX: 0, cropY: 0, cropW: 0, cropH: 0 });
  
  const [renderedImageRect, setRenderedImageRect] = useState<RenderedRect | null>(null);

  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('manual');
  const [isAiReframing, setIsAiReframing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAspectRatio, setAiAspectRatio] = useState<FalAspectRatio>('9:16');

  const updateRenderedImageRect = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      if (naturalWidth === 0 || naturalHeight === 0) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerAspect = containerRect.width / containerRect.height;
      const imageAspect = naturalWidth / naturalHeight;

      let width, height, left, top;

      if (imageAspect > containerAspect) {
        width = containerRect.width;
        height = width / imageAspect;
        left = 0;
        top = (containerRect.height - height) / 2;
      } else {
        height = containerRect.height;
        width = height * imageAspect;
        top = 0;
        left = (containerRect.width - width) / 2;
      }
      setRenderedImageRect({ left, top, width, height });
    }
  }, []);

  const getTargetAspectRatio = useCallback(() => {
      const selected = aspectRatios.find(ar => ar.name === activeAspectRatioName);
      if (selected?.value) {
          return selected.value;
      }
      if (imageRef.current) {
          const { naturalWidth, naturalHeight } = imageRef.current;
          if (naturalHeight > 0) return naturalWidth / naturalHeight;
      }
      return 1;
  }, [activeAspectRatioName]);

  const resetToAspectRatio = useCallback((aspect: number | null, name: string) => {
    setActiveAspectRatioName(name);
    if (!imageRef.current?.complete || imageRef.current.naturalWidth === 0) return;
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    const targetAspect = aspect === null ? naturalWidth / naturalHeight : aspect;

    let newWidth, newHeight;
    const imageAspect = naturalWidth / naturalHeight;

    if (imageAspect > targetAspect) {
      newHeight = naturalHeight;
      newWidth = newHeight * targetAspect;
    } else {
      newWidth = naturalWidth;
      newHeight = newWidth / targetAspect;
    }

    const newX = (naturalWidth - newWidth) / 2;
    const newY = (naturalHeight - newHeight) / 2;
    setCrop({ x: newX, y: newY, width: newWidth, height: newHeight });
  }, []);
  
  const handleImageLoad = useCallback(() => {
    updateRenderedImageRect();
    resetToAspectRatio(9/16, '9:16');
  }, [updateRenderedImageRect, resetToAspectRatio]);
  
  useEffect(() => {
    if (!isOpen) return;
    const image = imageRef.current;
    if (!image) return;

    setActiveTab('manual');
    setIsAiReframing(false);
    setAiError(null);
    setCrop(null);
    setActiveAspectRatioName('9:16');
    setAiAspectRatio('9:16');

    if (image.complete && image.naturalWidth > 0) {
      handleImageLoad();
    }
  }, [isOpen, imageUrl, handleImageLoad]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
        updateRenderedImageRect();
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [updateRenderedImageRect]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, action: 'move' | 'resize', corner?: Corner) => {
    if (!crop) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setAction(action);
    if (corner) setActiveCorner(corner);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!action || !crop || !imageRef.current || !renderedImageRect) return;
    e.preventDefault();
    
    const { naturalWidth, naturalHeight } = imageRef.current;
    const { width: renderedWidth, height: renderedHeight } = renderedImageRect;
    if (renderedWidth === 0 || renderedHeight === 0) return;

    const scaleX = naturalWidth / renderedWidth;
    const scaleY = naturalHeight / renderedHeight;
    
    const dx = (e.clientX - dragStartRef.current.pointerX) * scaleX;
    const dy = (e.clientY - dragStartRef.current.pointerY) * scaleY;

    if (action === 'move') {
      let newX = dragStartRef.current.cropX + dx;
      let newY = dragStartRef.current.cropY + dy;
      
      newX = Math.max(0, Math.min(newX, naturalWidth - crop.width));
      newY = Math.max(0, Math.min(newY, naturalHeight - crop.height));
      setCrop({ ...crop, x: newX, y: newY });
    } else if (action === 'resize' && activeCorner) {
        let { x, y, width, height } = { ...dragStartRef.current, x: dragStartRef.current.cropX, y: dragStartRef.current.cropY, width: dragStartRef.current.cropW, height: dragStartRef.current.cropH };
        const aspectRatio = getTargetAspectRatio();
        const minWidth = MIN_CROP_SIZE_PX * scaleX;
        const minHeight = MIN_CROP_SIZE_PX * scaleY;

        switch (activeCorner) {
            case 'br':
                width += dx;
                height = width / aspectRatio;
                break;
            case 'bl':
                width -= dx;
                x += dx;
                height = width / aspectRatio;
                break;
            case 'tr':
                width += dx;
                height = width / aspectRatio;
                y += dragStartRef.current.cropH - height;
                break;
            case 'tl':
                width -= dx;
                x += dx;
                height = width / aspectRatio;
                y += dragStartRef.current.cropH - height;
                break;
        }

        if (width < minWidth) {
            width = minWidth;
            height = width / aspectRatio;
            if (activeCorner === 'bl' || activeCorner === 'tl') x = dragStartRef.current.cropX + dragStartRef.current.cropW - width;
            if (activeCorner === 'tr' || activeCorner === 'tl') y = dragStartRef.current.cropY + dragStartRef.current.cropH - height;
        }
        if (height < minHeight) {
            height = minHeight;
            width = height * aspectRatio;
            if (activeCorner === 'bl' || activeCorner === 'tl') x = dragStartRef.current.cropX + dragStartRef.current.cropW - width;
            if (activeCorner === 'tr' || activeCorner === 'tl') y = dragStartRef.current.cropY + dragStartRef.current.cropH - height;
        }
        
        // Clamp to boundaries
        if (x < 0) { width += x; x = 0; height = width/aspectRatio; }
        if (y < 0) { height += y; y = 0; width = height*aspectRatio; }
        if (x + width > naturalWidth) { width = naturalWidth - x; height = width/aspectRatio; }
        if (y + height > naturalHeight) { height = naturalHeight - y; width = height*aspectRatio; }
        
        // Final sanity check on bounds for all corners
        if (x < 0) { x = 0; }
        if (y < 0) { y = 0; }
        if (x + width > naturalWidth) { x = naturalWidth - width; }
        if (y + height > naturalHeight) { y = naturalHeight - height; }

        setCrop({ x, y, width, height });
    }
  }, [action, activeCorner, crop, renderedImageRect, getTargetAspectRatio]);
  
  const handlePointerUp = useCallback((e: PointerEvent) => {
    if (action) {
        setAction(null);
        setActiveCorner(null);
        const target = e.currentTarget as HTMLElement | Window;
        if ('releasePointerCapture' in target && (target as HTMLElement).hasPointerCapture(e.pointerId)) {
           (target as HTMLElement).releasePointerCapture(e.pointerId);
        }
    }
  }, [action]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (action && container) {
      container.addEventListener('pointermove', handlePointerMove as EventListener);
      container.addEventListener('pointerup', handlePointerUp as EventListener);
      container.addEventListener('pointerleave', handlePointerUp as EventListener);
    }
    return () => {
      if (container) {
          container.removeEventListener('pointermove', handlePointerMove as EventListener);
          container.removeEventListener('pointerup', handlePointerUp as EventListener);
          container.removeEventListener('pointerleave', handlePointerUp as EventListener);
      }
    }
  }, [action, handlePointerMove, handlePointerUp]);
  
  const handleConfirmCrop = async () => {
    if (!crop || !imageRef.current || !imageUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imageRef.current, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    try {
      await onCropComplete(croppedDataUrl);
    } catch (e) {
      console.error("Error during crop completion:", e);
    }
  };

  const handleAiReframe = async () => {
    if (!imageUrl) return;
    setIsAiReframing(true);
    setAiError(null);
    try {
        const imageBlob = await dataUrlToBlob(imageUrl);
        const reframedUrl = await reframeImageFal(imageBlob, aiAspectRatio);
        
        const response = await fetch(reframedUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch reframed image: ${response.statusText}`);
        }
        const blob = await response.blob();
        
        const base64data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result && typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Could not read file as data URL.'));
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(blob);
        });
        
        onAiReframeComplete(base64data);
        setActiveTab('manual');

    } catch(e: any) {
        console.error("AI reframe failed:", e);
        setAiError(e.message || "An unknown error occurred during AI reframing.");
    } finally {
        setIsAiReframing(false);
    }
  };
  
  const cropOverlayStyle: React.CSSProperties = (crop && renderedImageRect) ? {
      position: 'absolute',
      left: `${renderedImageRect.left}px`,
      top: `${renderedImageRect.top}px`,
      width: `${renderedImageRect.width}px`,
      height: `${renderedImageRect.height}px`,
  } : { display: 'none' };
  
  const cropBoxStyle: React.CSSProperties = (crop && renderedImageRect && imageRef.current && imageRef.current.naturalWidth > 0) ? {
      position: 'absolute',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
      touchAction: 'none',
      left: `${(crop.x / imageRef.current.naturalWidth) * 100}%`,
      top: `${(crop.y / imageRef.current.naturalHeight) * 100}%`,
      width: `${(crop.width / imageRef.current.naturalWidth) * 100}%`,
      height: `${(crop.height / imageRef.current.naturalHeight) * 100}%`,
  } : { display: 'none' };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Reframe Image</DialogTitle>
          <DialogDescription>
            Adjust the frame manually or use AI to find the perfect composition.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex border-b border-zinc-800">
            <button
                onClick={() => setActiveTab('manual')}
                className={cn('px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors', activeTab === 'manual' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white')}
            >
                Manual Crop
            </button>
            <button
                onClick={() => setActiveTab('ai')}
                className={cn('px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors', activeTab === 'ai' ? 'border-white text-white' : 'border-transparent text-zinc-400 hover:text-white')}
            >
                AI Reframe
            </button>
        </div>
        
        {activeTab === 'manual' && (
            <div className="py-4 space-y-4">
              <div ref={containerRef} className={cn("relative w-full h-[60vh] flex items-center justify-center bg-zinc-900 overflow-hidden touch-none", action === 'move' ? 'cursor-grabbing' : 'cursor-default')}>
                {imageUrl && (
                  <>
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Crop preview"
                    onLoad={handleImageLoad}
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  />
                  <div style={cropOverlayStyle}>
                      {crop && (
                        <div 
                            style={cropBoxStyle}
                            className="cursor-grab"
                            onPointerDown={(e) => handlePointerDown(e, 'move')}
                        >
                            <div className="absolute inset-0 border-2 border-dashed border-white pointer-events-none"></div>
                            <div onPointerDown={(e) => handlePointerDown(e, 'resize', 'tl')} className="absolute -top-2 -left-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize border-2 border-zinc-900"></div>
                            <div onPointerDown={(e) => handlePointerDown(e, 'resize', 'tr')} className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize border-2 border-zinc-900"></div>
                            <div onPointerDown={(e) => handlePointerDown(e, 'resize', 'bl')} className="absolute -bottom-2 -left-2 w-4 h-4 bg-white rounded-full cursor-nesw-resize border-2 border-zinc-900"></div>
                            <div onPointerDown={(e) => handlePointerDown(e, 'resize', 'br')} className="absolute -bottom-2 -right-2 w-4 h-4 bg-white rounded-full cursor-nwse-resize border-2 border-zinc-900"></div>
                        </div>
                      )}
                  </div>
                  </>
                )}
              </div>
              <div className="flex justify-center items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-zinc-400">Aspect Ratio:</p>
                {aspectRatios.map(ar => (
                  <Button
                    key={ar.name}
                    variant={activeAspectRatioName === ar.name ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => resetToAspectRatio(ar.value, ar.name)}
                  >
                    {ar.name}
                  </Button>
                ))}
              </div>
            </div>
        )}

        {activeTab === 'ai' && imageUrl && (
             <div className="py-4 space-y-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
                <img src={imageUrl} alt="Original for AI reframe" className="max-w-xs max-h-80 object-contain rounded-md mb-4 shadow-lg"/>
                <h3 className="text-lg font-semibold text-zinc-100">AI Automatic Reframe</h3>
                <p className="text-zinc-400 max-w-md">
                    Let our AI automatically analyze your image and reframe it for the best composition. Select a target aspect ratio below.
                </p>
                <div className="flex justify-center items-center gap-2 flex-wrap pt-2">
                    {aiAspectRatios.map(ar => (
                      <Button
                        key={ar}
                        variant={aiAspectRatio === ar ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => setAiAspectRatio(ar)}
                      >
                        {ar}
                      </Button>
                    ))}
                </div>
                <Button onClick={handleAiReframe} disabled={isAiReframing} size="lg" className="mt-4">
                    {isAiReframing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Reframing...
                        </>
                    ) : "Start AI Reframe"}
                </Button>
                {aiError && <p className="text-red-400 mt-2 text-sm">{aiError}</p>}
            </div>
        )}

        <DialogFooter>
          <Button onClick={onCancel} variant="outline">Cancel</Button>
          {activeTab === 'manual' && (
              <Button onClick={handleConfirmCrop} disabled={!crop}>
                <Crop className="mr-2 h-4 w-4" />
                Confirm Crop
              </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
