'use client';

import { ImagePreview } from './ImagePreview';

interface ComparisonProps {
  originalSrc: string;
  processedSrc: string;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
}

export function Comparison({
  originalSrc,
  processedSrc,
  originalDimensions,
  processedDimensions
}: ComparisonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">Avant</h3>
        <ImagePreview
          imageSrc={originalSrc}
          title="Original"
          dimensions={originalDimensions}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider text-center">Après</h3>
        <ImagePreview
          imageSrc={processedSrc}
          title="Modifié"
          dimensions={processedDimensions}
          isResult
        />
      </div>
    </div>
  );
}
