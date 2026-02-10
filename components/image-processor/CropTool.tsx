'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CropData } from '@/types/image-processor';
import { Button } from '@/components/ui/button';
import { Check, X, RotateCcw } from 'lucide-react';

interface CropToolProps {
  imageSrc: string;
  onApply: (cropData: CropData) => void;
  onCancel: () => void;
}

export function CropTool({ imageSrc, onApply, onCancel }: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragHandle, setDragHandle] = useState<string | null>(null);

  // Initialize crop to center 80%
  const initializeCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;
    const { width, height } = imageRef.current.getBoundingClientRect();
    const cropW = width * 0.8;
    const cropH = height * 0.8;
    const cropX = (width - cropW) / 2;
    const cropY = (height - cropH) / 2;

    setCrop({
        x: cropX, // Relative to displayed image
        y: cropY,
        width: cropW,
        height: cropH
    });
  }, []);

  // Handle image load to init crop
  const onImageLoad = () => {
      initializeCrop();
  };

  const getRelativeCoords = (e: MouseEvent | React.MouseEvent) => {
      if (!containerRef.current || !imageRef.current) return { x: 0, y: 0 };
      const rect = imageRef.current.getBoundingClientRect();
      return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
      e.stopPropagation();
      e.preventDefault();
      setIsDragging(true);
      setDragHandle(handle);
      const coords = getRelativeCoords(e);
      setDragStart(coords); // For 'move', we might need offset from crop.x/y
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging || !crop || !imageRef.current) return;

      const coords = getRelativeCoords(e);
      const { width: imgW, height: imgH } = imageRef.current.getBoundingClientRect();

      setCrop(prev => {
          if (!prev) return null;
          let newCrop = { ...prev };

          if (dragHandle === 'move') {
              // Delta movement
              // Actually easier: dragStart was just click point.
              // We need to track delta or update start point.
              // Let's use simple delta approach with refs if complex,
              // but here let's just calc difference from previous mouse event?
              // Standard way: keep "start click relative to crop top-left".
              // For now, let's implement a simpler "center follows mouse" or similar?
              // Better: dragStart is the initial click. We need initial Crop state too.
              // Let's switch to standard "delta" approach:
          }

          // RE-IMPLEMENTING LOGIC:
          // Just calculate based on handle:

          // Clamping helper
          const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

          if (dragHandle === 'nw') {
              const right = prev.x + prev.width;
              const bottom = prev.y + prev.height;
              const newX = clamp(coords.x, 0, right - 50);
              const newY = clamp(coords.y, 0, bottom - 50);
              newCrop.x = newX;
              newCrop.y = newY;
              newCrop.width = right - newX;
              newCrop.height = bottom - newY;
          } else if (dragHandle === 'ne') {
              const bottom = prev.y + prev.height;
              const newY = clamp(coords.y, 0, bottom - 50);
              const newW = clamp(coords.x - prev.x, 50, imgW - prev.x);
              newCrop.y = newY;
              newCrop.width = newW;
              newCrop.height = bottom - newY;
          } else if (dragHandle === 'sw') {
              const right = prev.x + prev.width;
              const newX = clamp(coords.x, 0, right - 50);
              const newH = clamp(coords.y - prev.y, 50, imgH - prev.y);
              newCrop.x = newX;
              newCrop.width = right - newX;
              newCrop.height = newH;
          } else if (dragHandle === 'se') {
             const newW = clamp(coords.x - prev.x, 50, imgW - prev.x);
             const newH = clamp(coords.y - prev.y, 50, imgH - prev.y);
             newCrop.width = newW;
             newCrop.height = newH;
          } else if (dragHandle === 'move') {
             // For move, we need the offset.
             // Ideally we stored (clickX - cropX, clickY - cropY) on MouseDown.
             // We can use a ref for that "dragOffset".
          }

          return newCrop;
      });

  }, [isDragging, dragHandle, crop]);

  // Ref for move offset
  const moveOffset = useRef({ x: 0, y: 0 });

  const onMouseDownMove = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (!crop) return;
      setIsDragging(true);
      setDragHandle('move');
      const coords = getRelativeCoords(e);
      moveOffset.current = {
          x: coords.x - crop.x,
          y: coords.y - crop.y
      };
  };

  // Separate effect for move handling to use the Ref
  useEffect(() => {
      const handleMove = (e: MouseEvent) => {
        if (!isDragging || dragHandle !== 'move' || !imageRef.current || !crop) return;

        const coords = getRelativeCoords(e);
        const { width: imgW, height: imgH } = imageRef.current.getBoundingClientRect();

        let newX = coords.x - moveOffset.current.x;
        let newY = coords.y - moveOffset.current.y;

        // Clamp position
        newX = Math.max(0, Math.min(newX, imgW - crop.width));
        newY = Math.max(0, Math.min(newY, imgH - crop.height));

        setCrop(prev => prev ? ({ ...prev, x: newX, y: newY }) : null);
      };

      if (isDragging) {
          window.addEventListener('mousemove', dragHandle === 'move' ? handleMove : handleMouseMove);
          window.addEventListener('mouseup', () => setIsDragging(false));
      }
      return () => {
          window.removeEventListener('mousemove', dragHandle === 'move' ? handleMove : handleMouseMove);
          window.removeEventListener('mouseup', () => setIsDragging(false));
      };
  }, [isDragging, dragHandle, handleMouseMove, crop]); // crop added to deps might cause jitter if not careful, but needed for bounds

  const handleApply = () => {
      if (!crop || !imageRef.current) return;

      // Convert display coordinates to actual image coordinates
      const displayedW = imageRef.current.width;
      const displayedH = imageRef.current.height;
      const naturalW = imageRef.current.naturalWidth;
      const naturalH = imageRef.current.naturalHeight;

      const scaleX = naturalW / displayedW;
      const scaleY = naturalH / displayedH;

      const realCrop: CropData = {
          x: crop.x * scaleX,
          y: crop.y * scaleY,
          width: crop.width * scaleX,
          height: crop.height * scaleY
      };

      onApply(realCrop);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-lg dark:text-white">Outil de Recadrage</h3>
            <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={initializeCrop}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Réinitialiser
                </Button>
            </div>
        </div>

        {/* Editor Area */}
        <div className="flex-grow overflow-auto p-4 flex items-center justify-center bg-gray-100 dark:bg-gray-950/50" ref={containerRef}>
            <div className="relative inline-block select-none">
                {/* Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Crop target"
                    className="max-h-[60vh] object-contain block pointer-events-none"
                    onLoad={onImageLoad}
                />

                {/* Overlay (Darken outside crop) */}
                {crop && (
                    <>
                        {/* Top */}
                        <div className="absolute top-0 left-0 right-0 bg-black/50" style={{ height: crop.y }} />
                        {/* Bottom */}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50" style={{ top: crop.y + crop.height }} />
                        {/* Left */}
                        <div className="absolute left-0 bg-black/50" style={{ top: crop.y, height: crop.height, width: crop.x }} />
                        {/* Right */}
                        <div className="absolute right-0 bg-black/50" style={{ top: crop.y, height: crop.height, left: crop.x + crop.width }} />

                        {/* Crop Box */}
                        <div
                            className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)] cursor-move"
                            style={{
                                top: crop.y,
                                left: crop.x,
                                width: crop.width,
                                height: crop.height
                            }}
                            onMouseDown={onMouseDownMove}
                        >
                            {/* Grid Lines (Rule of Thirds) */}
                            <div className="absolute inset-0 flex flex-col pointer-events-none opacity-50">
                                <div className="flex-1 border-b border-white/30" />
                                <div className="flex-1 border-b border-white/30" />
                                <div className="flex-1" />
                            </div>
                            <div className="absolute inset-0 flex pointer-events-none opacity-50">
                                <div className="flex-1 border-r border-white/30" />
                                <div className="flex-1 border-r border-white/30" />
                                <div className="flex-1" />
                            </div>

                            {/* Handles */}
                            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-gray-400 cursor-nw-resize" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-gray-400 cursor-ne-resize" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-gray-400 cursor-sw-resize" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                            <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-gray-400 cursor-se-resize" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-gray-900">
            <Button variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Check className="w-4 h-4 mr-2" /> Valider le recadrage
            </Button>
        </div>

      </div>
    </div>
  );
}
