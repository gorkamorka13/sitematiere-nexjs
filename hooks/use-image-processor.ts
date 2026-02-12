'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ImageData,
  ProcessedImage,
  CropData,
  ImageFormat,
  HistoryItem
} from '@/types/image-processor';
import {
  loadImageFromFile,
  resizeImage,
  cropImage,
  calculateCompressionRatio
} from '@/lib/image-utils';

interface UseImageProcessorReturn {
  originalImage: ImageData | null;
  currentImage: ImageData | null;
  processedImage: ProcessedImage | null;
  isProcessing: boolean;
  cropData: CropData | null;
  isCropping: boolean;
  history: HistoryItem[];

  // Actions
  loadImage: (file: File) => Promise<void>;
  loadImageFromUrl: (url: string, filename: string) => Promise<void>;
  resizeImageAction: (width: number, height: number, quality: number, format: ImageFormat) => Promise<void>;
  enableCrop: () => void;
  applyCrop: (cropData: CropData) => Promise<void>; // Modified signature to just take cropData
  cancelCrop: () => void;
  // previewResult is often redundant if resize/crop updates state directly,
  // but we can keep a "process" trigger if needed. For now, let's say actions trigger processing.
  downloadImage: () => void;
  loadFromHistory: (index: number) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

export const useImageProcessor = (): UseImageProcessorReturn => {
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropData, setCropData] = useState<CropData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Helper to add to history
  const addToHistory = useCallback((action: string, details: string, newImage: ImageData) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      action,
      details,
      thumbnail: newImage.src, // simplistic for now, could be resized for thumb
      timestamp: new Date(),
      imageData: newImage
    };
    setHistory(prev => [newItem, ...prev].slice(0, 10));
  }, []);

  const loadImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const img = await loadImageFromFile(file);
      const imageData: ImageData = {
        src: img.src,
        file,
        width: img.width,
        height: img.height,
        size: file.size
      };
      setOriginalImage(imageData);
      setCurrentImage(imageData);
      setProcessedImage(null);
      setHistory([]);
    } catch (error) {
      console.error("Failed to load image", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const loadImageFromUrl = useCallback(async (url: string, filename: string) => {
    setIsProcessing(true);
    try {
      // Use proxy to avoid CORS issues
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Proxy fetch failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      await loadImage(file);
    } catch (error) {
      console.error("Failed to load image from URL", error);
    } finally {
      setIsProcessing(false);
    }
  }, [loadImage]);

  const resizeImageAction = useCallback(async (width: number, height: number, quality: number, format: ImageFormat) => {
    if (!currentImage) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = currentImage.src;
      await new Promise(r => img.onload = r);

      const dataUrl = resizeImage(img, width, height, quality, format);

      // Convert DataURL to File size approximation
      const head = 'data:image/' + format + ';base64,';
      const size = Math.round((dataUrl.length - head.length) * 3 / 4);

      const newImage: ProcessedImage = {
        src: dataUrl,
        file: currentImage.file, // Keep original file ref or create new? Keeping ref for name
        width,
        height,
        size,
        compressionRatio: 0 // Will verify later
      };

      if (originalImage) {
        newImage.compressionRatio = calculateCompressionRatio(originalImage.size, size);
      }

      setProcessedImage(newImage);
      // We don't automatically overwrite currentImage,
      // typically we might want to "Apply" or just Download.
      // But for history flow, let's treat processed as a potential new state

      // NOTE: Logic choice: Does resize update "current" for further ops?
      // Usually yes.
      setCurrentImage(newImage);
      addToHistory('Resize', `${width}x${height}, Q${quality}, ${format}`, newImage);

    } catch (error) {
      console.error("Resize failed", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, originalImage, addToHistory]);

  const enableCrop = useCallback(() => {
    if (!currentImage) return;
    setIsCropping(true);
    // Initialize crop data to full image or center?
    // CropTool usually handles init
  }, [currentImage]);

  const applyCrop = useCallback(async (data: CropData) => {
    if (!currentImage) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = currentImage.src;
      await new Promise(r => img.onload = r);

      // Default quality/format for crop usually keeps original or high
      const dataUrl = cropImage(img, data, 100, 'jpeg'); // defaulting to jpeg high for now

      const head = 'data:image/jpeg;base64,';
      const size = Math.round((dataUrl.length - head.length) * 3 / 4);

      const newImage: ProcessedImage = {
        src: dataUrl,
        file: currentImage.file,
        width: data.width,
        height: data.height,
        size,
        compressionRatio: 0
      };
      if (originalImage) {
        newImage.compressionRatio = calculateCompressionRatio(originalImage.size, size);
      }

      setCurrentImage(newImage);
      setProcessedImage(newImage);
      addToHistory('Crop', `${data.width}x${data.height}`, newImage);
      setIsCropping(false);
    } catch (error) {
      console.error("Crop failed", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, originalImage, addToHistory]);

  const cancelCrop = useCallback(() => {
    setIsCropping(false);
  }, []);

  const downloadImage = useCallback(() => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage.src;
    link.download = `processed-${Date.now()}.jpg`; // Could infer ext
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImage]);

  const loadFromHistory = useCallback((index: number) => {
    const item = history[index];
    if (item) {
      setCurrentImage(item.imageData);
      setProcessedImage({ ...item.imageData, compressionRatio: 0 }); // Re-calc ratio?
      // Slice history to remove future items if valid "undo" behavior,
      // or just jump state. Let's just jump state.
    }
  }, [history]);

  const reset = useCallback(() => {
    setOriginalImage(null);
    setCurrentImage(null);
    setProcessedImage(null);
    setHistory([]);
    setIsCropping(false);
  }, []);

  return {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    cropData, // managed by tool mostly
    isCropping,
    history,
    loadImage,
    loadImageFromUrl,
    resizeImageAction,
    enableCrop,
    applyCrop,
    cancelCrop,
    downloadImage,
    loadFromHistory,
    setIsProcessing,
    reset
  };
};
