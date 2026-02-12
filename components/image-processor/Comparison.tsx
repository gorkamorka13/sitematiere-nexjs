'use client';

import { ImageData, ProcessedImage } from '@/types/image-processor';
import { ImagePreview } from './ImagePreview';

interface ComparisonProps {
  original: ImageData;
  processed: ImageData | ProcessedImage;
}

export function Comparison({
  original,
  processed,
}: ComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">Avant</h3>
        <ImagePreview
          imageSrc={original.src}
          title="Original"
          size={original.size}
          dimensions={{ width: original.width, height: original.height }}
          filename={original.file.name}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">Après</h3>
        <ImagePreview
          imageSrc={processed.src}
          title="Modifié"
          size={processed.size}
          dimensions={{ width: processed.width, height: processed.height }}
          compressionRatio={(processed as ProcessedImage).compressionRatio}
          filename={processed.file.name}
          isResult
        />
      </div>
    </div>
  );
}
