export interface ImageData {
  src: string;
  file: File;
  width: number;
  height: number;
  size: number;
}

export interface ProcessedImage extends ImageData {
  compressionRatio: number;
}

export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HistoryItem {
  id: string;
  action: string;
  details: string;
  thumbnail: string;
  timestamp: Date;
  imageData: ImageData;
}

export type ImageFormat = 'jpeg' | 'png' | 'webp';
