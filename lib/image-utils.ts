export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const resizeImage = (
  sourceImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  quality: number,
  format: 'jpeg' | 'png' | 'webp'
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality / 100);
};

export const cropImage = (
  sourceImage: HTMLImageElement,
  cropData: { x: number; y: number; width: number; height: number },
  quality: number,
  format: 'jpeg' | 'png' | 'webp'
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = cropData.width;
  canvas.height = cropData.height;

  ctx.drawImage(
    sourceImage,
    cropData.x, cropData.y, cropData.width, cropData.height,
    0, 0, cropData.width, cropData.height
  );

  const mimeType = `image/${format}`;
  return canvas.toDataURL(mimeType, quality / 100);
};

export const calculateAspectRatio = (
  originalWidth: number,
  originalHeight: number,
  targetWidth: number
): number => {
  const ratio = targetWidth / originalWidth;
  return Math.round(originalHeight * ratio);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const calculateCompressionRatio = (
  originalSize: number,
  processedSize: number
): number => {
  return Math.round(((originalSize - processedSize) / originalSize) * 100);
};
