'use client';

import { useState, useEffect } from 'react';

// Extend Window interface for custom dispatch function
declare global {
  interface Window {
    dispatchUploadEvent?: () => void;
  }
}
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ImageFormat } from '@/types/image-processor';
import { RotateCw, Crop, Download, Play, GripHorizontal } from 'lucide-react';
import { calculateAspectRatio } from '@/lib/image-utils';

interface ControlsProps {
  originalDimensions: { width: number; height: number } | null;
  onResize: (width: number, height: number, quality: number, format: ImageFormat) => void;
  onCrop: () => void;
  onDownload: () => void;
  isProcessing: boolean;
}

export function Controls({
  originalDimensions,
  onResize,
  onCrop,
  onDownload,
  isProcessing
}: ControlsProps) {
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [quality, setQuality] = useState<number>(90);
  const [format, setFormat] = useState<ImageFormat>('jpeg');
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true);

  // Initialize with original dimensions
  useEffect(() => {
    if (originalDimensions) {
      setWidth(originalDimensions.width);
      setHeight(originalDimensions.height);
    }
  }, [originalDimensions]);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (maintainAspect && originalDimensions) {
      const newHeight = calculateAspectRatio(originalDimensions.width, originalDimensions.height, val);
      setHeight(newHeight);
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (maintainAspect && originalDimensions) {
       // Reverse aspect calculation
       const ratio = originalDimensions.width / originalDimensions.height;
       const newWidth = Math.round(val * ratio);
       setWidth(newWidth);
    }
  };

  const handleApply = () => {
      onResize(width, height, quality, format);
  };

  if (!originalDimensions) return null;

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">

      {/* 1. Dimensions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <GripHorizontal className="w-4 h-4 text-indigo-500" /> Redimensionner
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="width" className="text-xs">Largeur (px)</Label>
            <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => handleWidthChange(Number(e.target.value))}
                className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="height" className="text-xs">Hauteur (px)</Label>
            <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="aspect"
            checked={maintainAspect}
            onCheckedChange={(checked) => setMaintainAspect(checked as boolean)}
          />
          <Label htmlFor="aspect" className="text-sm text-gray-600 dark:text-gray-400 font-normal">
            Conserver le ratio d&apos;aspect
          </Label>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

      {/* 2. Format & Quality */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-blue-500" /> Format & Qualité
        </h3>

        <div className="space-y-3">
             <Label className="text-xs text-gray-500 dark:text-gray-400">Format de sortie</Label>
             <RadioGroup
                value={format}
                onValueChange={(val) => setFormat(val as ImageFormat)}
                className="flex gap-4"
             >
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpeg" id="jpeg" />
                    <Label htmlFor="jpeg" className="font-mono">JPEG</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png" className="font-mono">PNG</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webp" id="webp" />
                    <Label htmlFor="webp" className="font-mono">WebP</Label>
                </div>
            </RadioGroup>
        </div>

        <div className="space-y-3 pt-2">
            <div className="flex justify-between">
                <Label className="text-xs text-gray-500 dark:text-gray-400">Qualité ({quality}%)</Label>
            </div>
            <Slider
                value={[quality]}
                onValueChange={(vals) => setQuality(vals[0])}
                max={100}
                step={1}
                className="w-full"
            />
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-gray-700 my-4" />

      {/* 3. Actions */}
      <div className="space-y-3">
        <Button
            onClick={handleApply}
            disabled={isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
            {isProcessing ? <RotateCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Appliquer les changements
        </Button>

        <div className="flex flex-col gap-3">
            <Button
                onClick={onCrop}
                variant="outline"
                disabled={isProcessing}
                className="w-full h-11"
            >
                <Crop className="w-4 h-4 mr-2" /> Recadrer l&apos;image
            </Button>

            <div className="grid grid-cols-2 gap-3">
                <Button
                    onClick={onDownload}
                    variant="secondary"
                    disabled={isProcessing}
                    className="h-11 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 text-[11px] sm:text-xs px-2"
                >
                    <Download className="w-4 h-4 mr-2 hidden xs:block" /> Sur mon PC
                </Button>
                <Button
                    onClick={() => window.dispatchUploadEvent?.()}
                    variant="secondary"
                    disabled={isProcessing}
                    className="h-11 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 text-[11px] sm:text-xs px-2"
                >
                    <RotateCw className="w-4 h-4 mr-2 hidden xs:block" /> Sur la Base
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
