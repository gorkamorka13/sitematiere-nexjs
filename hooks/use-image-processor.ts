'use client';

import { useState, useCallback } from 'react';
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
  applyCrop: (cropData: CropData, targetDimensions?: { width: number; height: number }) => Promise<void>;
  commitProcessedImage: () => void;
  cancelProcessedImage: () => void;
  cancelCrop: () => void;
  downloadImage: () => void;
  loadFromHistory: (index: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
  reset: () => void;
}

export const useImageProcessor = (): UseImageProcessorReturn => {
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropData] = useState<CropData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Helper to add to history
  const addToHistory = useCallback((action: string, details: string, newImage: ImageData) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      action,
      details,
      thumbnail: newImage.src,
      timestamp: new Date(),
      imageData: newImage
    };
    setHistory(prev => [newItem, ...prev].slice(0, 10));
    setRedoStack([]); // Clear redo stack on new action
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
      setRedoStack([]);
    } catch (error) {
      console.error("Failed to load image", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const loadImageFromUrl = useCallback(async (url: string, filename: string) => {
    setIsProcessing(true);
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Proxy fetch failed: ${response.statusText}`);
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
      const head = 'data:image/' + format + ';base64,';
      const size = Math.round((dataUrl.length - head.length) * 3 / 4);

      const newImage: ProcessedImage = {
        src: dataUrl,
        file: currentImage.file,
        width,
        height,
        size,
        compressionRatio: 0,
        tempAction: 'Resize',
        tempDetails: `${width}x${height}, Q${quality}, ${format}`
      };

      if (originalImage) {
        newImage.compressionRatio = calculateCompressionRatio(originalImage.size, size);
      }

      setProcessedImage(newImage);
    } catch (error) {
      console.error("Resize failed", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, originalImage]);

  const enableCrop = useCallback(() => {
    if (!currentImage) return;
    setIsCropping(true);
  }, [currentImage]);

  const applyCrop = useCallback(async (data: CropData, targetDimensions?: { width: number; height: number }) => {
    if (!currentImage) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.src = currentImage.src;
      await new Promise(r => img.onload = r);

      let dataUrl = cropImage(img, data, 100, 'jpeg');
      let finalWidth = data.width;
      let finalHeight = data.height;

      if (targetDimensions) {
        const croppedImg = new Image();
        croppedImg.src = dataUrl;
        await new Promise(r => croppedImg.onload = r);
        dataUrl = resizeImage(croppedImg, targetDimensions.width, targetDimensions.height, 95, 'jpeg');
        finalWidth = targetDimensions.width;
        finalHeight = targetDimensions.height;
      }

      const head = 'data:image/jpeg;base64,';
      const size = Math.round((dataUrl.length - head.length) * 3 / 4);

      const newImage: ProcessedImage = {
        src: dataUrl,
        file: currentImage.file,
        width: finalWidth,
        height: finalHeight,
        size,
        compressionRatio: 0,
        tempAction: targetDimensions ? 'Crop & Resize' : 'Crop',
        tempDetails: `${finalWidth}x${finalHeight}`
      };

      if (originalImage) {
        newImage.compressionRatio = calculateCompressionRatio(originalImage.size, size);
      }

      setProcessedImage(newImage);
      setIsCropping(false);
    } catch (error) {
      console.error("Crop/Resize failed", error);
    } finally {
      setIsProcessing(false);
    }
  }, [currentImage, originalImage]);

  const commitProcessedImage = useCallback(() => {
    if (!processedImage) return;
    const newImage = { ...processedImage };
    setCurrentImage(newImage);
    addToHistory(newImage.tempAction || 'Edit', newImage.tempDetails || '', newImage);
    setProcessedImage(null);
  }, [processedImage, addToHistory]);

  const cancelProcessedImage = useCallback(() => {
    setProcessedImage(null);
  }, []);

  const cancelCrop = useCallback(() => {
    setIsCropping(false);
  }, []);

  const downloadImage = useCallback(() => {
    const activeImage = processedImage || currentImage;
    if (!activeImage) return;
    const link = document.createElement('a');
    link.href = activeImage.src;
    link.download = `processed-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImage, currentImage]);

  const loadFromHistory = useCallback((index: number) => {
    const item = history[index];
    if (item) {
      setCurrentImage(item.imageData);
      setProcessedImage(null);
      setRedoStack([]); // Loading from history restarts the chain
    }
  }, [history]);

  const undo = useCallback(() => {
    if (history.length > 0 && currentImage) {
      const lastItem = history[0];
      const newHistory = history.slice(1);

      setRedoStack(prev => [currentImage, ...prev]);
      setHistory(newHistory);

      // If there's a previous item in the new history, that's our new current
      // Otherwise it's the original image
      if (newHistory.length > 0) {
        setCurrentImage(newHistory[0].imageData);
      } else if (originalImage) {
        setCurrentImage(originalImage);
      }
    }
  }, [history, currentImage, originalImage]);

  const redo = useCallback(() => {
    if (redoStack.length > 0 && currentImage) {
      const nextImage = redoStack[0];
      const newRedoStack = redoStack.slice(1);

      // Add current to history before moving forward
      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        action: 'Redo',
        details: 'Rétablissement de l\'action',
        thumbnail: nextImage.src,
        timestamp: new Date(),
        imageData: nextImage
      };

      setHistory(prev => [newItem, ...prev]);
      setRedoStack(newRedoStack);
      setCurrentImage(nextImage);
    }
  }, [redoStack, currentImage]);

  const reset = useCallback(() => {
    setOriginalImage(null);
    setCurrentImage(null);
    setProcessedImage(null);
    setHistory([]);
    setRedoStack([]);
    setIsCropping(false);
  }, []);

  return {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    cropData,
    isCropping,
    history,
    loadImage,
    loadImageFromUrl,
    resizeImageAction,
    enableCrop,
    applyCrop,
    commitProcessedImage,
    cancelProcessedImage,
    cancelCrop,
    downloadImage,
    loadFromHistory,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    setIsProcessing,
    reset
  };
};
