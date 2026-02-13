'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { CropData } from '@/types/image-processor';
import { Button } from '@/components/ui/button';
import { Check, X, RotateCcw, RotateCw, Image as ImageIcon, ArrowLeft } from 'lucide-react';

interface CropToolProps {
  imageSrc: string;
  onApply: (cropData: CropData, targetDimensions?: { width: number; height: number }) => void;
  onCancel: () => void;
}

export function CropTool({ imageSrc, onApply, onCancel }: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [internalPreview, setInternalPreview] = useState<string | null>(null);
  const [targetDims, setTargetDims] = useState<{ width: number, height: number } | undefined>(undefined);
  const moveOffset = useRef({ x: 0, y: 0 });

  // Target aspect ratio
  const TARGET_RATIO = 850 / 525;

  // Initialize crop to 850x525 (Target) or cover if image is smaller
  const initializeCrop = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;

    // For object-contain, img.width/height gives the box.
    // We need the actual image content size within that box.
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;
    const boxW = img.width;
    const boxH = img.height;

    const imgRatio = naturalW / naturalH;
    const boxRatio = boxW / boxH;

    let displayedW, displayedH;
    if (imgRatio > boxRatio) {
        displayedW = boxW;
        displayedH = boxW / imgRatio;
    } else {
        displayedH = boxH;
        displayedW = boxH * imgRatio;
    }

    const scaleX = displayedW / naturalW;

    // Target size in displayed pixels
    let targetCropW = 850 * scaleX;
    let targetCropH = 525 * scaleX; // Use scaleX to maintain ratio relative to natural pixels

    // Clamp to 100% of image if target (850x525) is larger than the image itself
    if (targetCropW > displayedW || targetCropH > displayedH) {
        const ratio = TARGET_RATIO;
        if (displayedW / displayedH > ratio) {
            targetCropH = displayedH;
            targetCropW = targetCropH * ratio;
        } else {
            targetCropW = displayedW;
            targetCropH = targetCropW / ratio;
        }
    }

    // Offset in the container to properly center the crop box over the CONTAINED image
    const offsetX = (boxW - displayedW) / 2;
    const offsetY = (boxH - displayedH) / 2;

    const cropX = offsetX + (displayedW - targetCropW) / 2;
    const cropY = offsetY + (displayedH - targetCropH) / 2;

    setCrop({
        x: cropX,
        y: cropY,
        width: targetCropW,
        height: targetCropH
    });
  }, []);

  const getRelativeCoords = (e: MouseEvent | React.MouseEvent) => {
      if (!imageRef.current) return { x: 0, y: 0 };
      const rect = imageRef.current.getBoundingClientRect();
      return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  };

  const handleMouseDown = (e: React.MouseEvent, handle: string | null = null) => {
      e.stopPropagation();
      e.preventDefault();
      if (!crop) return;
      setIsDragging(true);
      setDragHandle(handle);
      if (handle === 'move') {
          const coords = getRelativeCoords(e);
          moveOffset.current = {
              x: coords.x - crop.x,
              y: coords.y - crop.y
          };
      }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging || !crop || !imageRef.current) return;

      const coords = getRelativeCoords(e);
      const { width: imgW, height: imgH } = imageRef.current.getBoundingClientRect();
      const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

      setCrop(prev => {
          if (!prev) return null;
          const newCrop = { ...prev };

          if (dragHandle === 'nw') {
              const right = prev.x + prev.width;
              const bottom = prev.y + prev.height;

              // Maintain aspect ratio
              const newW = right - coords.x;
              const newH = newW / TARGET_RATIO;

              const newX = right - newW;
              const newY = bottom - newH;

              if (newX >= 0 && newY >= 0 && newW >= 50 && newH >= 50) {
                  newCrop.x = newX;
                  newCrop.y = newY;
                  newCrop.width = newW;
                  newCrop.height = newH;
              }
          } else if (dragHandle === 'ne') {
              const bottom = prev.y + prev.height;

              const newW = coords.x - prev.x;
              const newH = newW / TARGET_RATIO;

              const newY = bottom - newH;

              if (prev.x + newW <= imgW && newY >= 0 && newW >= 50 && newH >= 50) {
                  newCrop.y = newY;
                  newCrop.width = newW;
                  newCrop.height = newH;
              }
          } else if (dragHandle === 'sw') {
              const right = prev.x + prev.width;

              const newW = right - coords.x;
              const newH = newW / TARGET_RATIO;

              const newX = right - newW;

              if (newX >= 0 && prev.y + newH <= imgH && newW >= 50 && newH >= 50) {
                  newCrop.x = newX;
                  newCrop.width = newW;
                  newCrop.height = newH;
              }
          } else if (dragHandle === 'se') {
              const newW = coords.x - prev.x;
              const newH = newW / TARGET_RATIO;

              if (prev.x + newW <= imgW && prev.y + newH <= imgH && newW >= 50 && newH >= 50) {
                  newCrop.width = newW;
                  newCrop.height = newH;
              }
          } else if (dragHandle === 'move') {
             let newX = coords.x - moveOffset.current.x;
             let newY = coords.y - moveOffset.current.y;
             newX = Math.max(0, Math.min(newX, imgW - prev.width));
             newY = Math.max(0, Math.min(newY, imgH - prev.height));
             newCrop.x = newX;
             newCrop.y = newY;
          }
          return newCrop;
      });
  }, [isDragging, dragHandle, crop]);

  useEffect(() => {
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', () => setIsDragging(false));
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', () => setIsDragging(false));
      };
  }, [isDragging, handleMouseMove]);

  const handleApplyPreview = async (withResize: boolean = false) => {
      if (!crop || !imageRef.current) return;

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

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = realCrop.width;
      canvas.height = realCrop.height;

      ctx.drawImage(
          imageRef.current,
          realCrop.x, realCrop.y, realCrop.width, realCrop.height,
          0, 0, realCrop.width, realCrop.height
      );

      let dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (withResize) {
          const resizeCanvas = document.createElement('canvas');
          const rCtx = resizeCanvas.getContext('2d');
          if (rCtx) {
              resizeCanvas.width = 850;
              resizeCanvas.height = 525;
              const tempImg = new Image();
              tempImg.src = dataUrl;
              await new Promise(r => tempImg.onload = r);
              rCtx.drawImage(tempImg, 0, 0, 850, 525);
              dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.95);
          }
      }

      setInternalPreview(dataUrl);
      setTargetDims(withResize ? { width: 850, height: 525 } : undefined);
      setCrop(realCrop);
  };

  const handleFinalConfirm = () => {
      if (!crop) return;
      onApply(crop, targetDims);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-5xl w-full flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                {internalPreview ? 'Aperçu du résultat' : 'Outil de Recadrage'}
            </h3>
            {!internalPreview && (
                <Button variant="ghost" size="sm" onClick={initializeCrop} className="text-xs uppercase font-bold tracking-widest h-8">
                    <RotateCcw className="w-4 h-4 mr-2" /> Réinitialiser
                </Button>
            )}
        </div>

        {/* Editor/Preview Area */}
        <div className="flex-grow overflow-auto p-8 flex items-center justify-center bg-gray-100 dark:bg-gray-950/50" ref={containerRef}>
            {internalPreview ? (
                <div className="relative group animate-in zoom-in-95 duration-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={internalPreview}
                        alt="Preview"
                        className="max-h-[60vh] object-contain block shadow-2xl border-4 border-white dark:border-gray-800"
                    />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg uppercase tracking-wider">
                        Résultat : {targetDims ? '850 × 525' : `${Math.round(crop?.width || 0)} × ${Math.round(crop?.height || 0)}`} px
                    </div>
                </div>
            ) : (
                <div className="relative inline-block select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imageRef}
                        src={imageSrc}
                        alt="Crop target"
                        className="max-h-[60vh] object-contain block pointer-events-none"
                        onLoad={initializeCrop}
                    />

                    {/* Overlay (Darken outside crop) */}
                    {crop && (
                        <>
                            {/* Top */}
                            <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]" style={{ height: crop.y }} />
                            {/* Bottom */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]" style={{ top: crop.y + crop.height }} />
                            {/* Left */}
                            <div className="absolute left-0 bg-black/60 backdrop-blur-[1px]" style={{ top: crop.y, height: crop.height, width: crop.x }} />
                            {/* Right */}
                            <div className="absolute right-0 bg-black/60 backdrop-blur-[1px]" style={{ top: crop.y, height: crop.height, left: crop.x + crop.width }} />

                            {/* Crop Box */}
                            <div
                                className="absolute border-2 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-move"
                                style={{
                                    top: crop.y,
                                    left: crop.x,
                                    width: crop.width,
                                    height: crop.height
                                }}
                                onMouseDown={(e) => handleMouseDown(e, 'move')}
                            >
                                {/* Dimensions Display */}
                                <div className="absolute -top-8 left-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-[11px] px-2 py-1 pointer-events-none rounded shadow-md border font-bold">
                                    {(() => {
                                        if (!imageRef.current) return '0 x 0';
                                        const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
                                        const scaleY = imageRef.current.naturalHeight / imageRef.current.height;
                                        return `${Math.round(crop.width * scaleX)} × ${Math.round(crop.height * scaleY)} px`;
                                    })()}
                                </div>

                                {/* Handles */}
                                <div className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 shadow-md cursor-nw-resize" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 shadow-md cursor-ne-resize" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                                <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 shadow-md cursor-sw-resize" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                                <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 shadow-md cursor-se-resize" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between gap-3 bg-white dark:bg-gray-900">
            {internalPreview ? (
                <>
                    <Button
                        variant="ghost"
                        onClick={() => setInternalPreview(null)}
                        className="text-xs font-bold uppercase tracking-widest order-3 sm:order-1"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Retour au réglage
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="text-xs font-bold uppercase tracking-widest"
                        >
                            <X className="w-4 h-4 mr-2" /> Annuler tout
                        </Button>
                        <Button
                            onClick={handleFinalConfirm}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-widest px-8 shadow-md"
                        >
                            <Check className="w-4 h-4 mr-2" /> Accepter le résultat
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={onCancel} className="text-xs font-bold uppercase tracking-widest order-3 sm:order-1">
                        <X className="w-4 h-4 mr-2" /> Annuler
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2 w-full sm:w-auto">
                        <Button
                            onClick={() => handleApplyPreview(false)}
                            variant="secondary"
                            className="text-xs font-bold uppercase tracking-widest shadow-sm border"
                        >
                            <Check className="w-4 h-4 mr-2" /> Recadrer seul
                        </Button>

                        <Button
                            onClick={() => handleApplyPreview(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-6 shadow-md"
                        >
                            <RotateCw className="w-4 h-4 mr-2" /> Recadrer & Redimensionner (850x525)
                        </Button>
                    </div>
                </>
            )}
        </div>

      </div>
    </div>
  );
}
