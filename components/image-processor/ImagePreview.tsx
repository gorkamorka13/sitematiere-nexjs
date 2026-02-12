'use client';

import { formatFileSize, calculateAspectRatio } from '@/lib/image-utils';
import { Badge } from '@/components/ui/badge';
import { ImageIcon } from 'lucide-react';

interface ImagePreviewProps {
  imageSrc: string;
  title: string;
  size?: number;
  dimensions?: { width: number; height: number };
  compressionRatio?: number;
  isResult?: boolean;
  filename?: string;
}

export function ImagePreview({
  imageSrc,
  title,
  size,
  dimensions,
  compressionRatio,
  isResult,
  filename
}: ImagePreviewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                {title}
            </h3>
            {filename && <span className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">{filename}</span>}
        </div>
        {isResult && compressionRatio !== undefined && (
          <Badge variant={compressionRatio > 0 ? "default" : "secondary"} className={compressionRatio > 0 ? "bg-green-500 hover:bg-green-600" : ""}>
            {compressionRatio > 0 ? `-${compressionRatio}%` : '0%'}
          </Badge>
        )}
      </div>

      <div className="relative flex-grow min-h-[200px] bg-gray-100 dark:bg-gray-900/50 flex items-center justify-center p-4">
          {/* Checkerboard pattern for transparency */}
          <div className="absolute inset-0 opacity-[0.4]" style={{
              backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}></div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={title}
          className="max-w-full max-h-[400px] object-contain relative z-10 shadow-lg rounded-lg"
        />
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
        {dimensions && (
          <div className="flex flex-col">
            <span className="uppercase font-bold text-[10px] tracking-wider text-gray-400">Dimensions</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">{Math.round(dimensions.width)} x {Math.round(dimensions.height)}px</span>
          </div>
        )}
        {size !== undefined && (
          <div className="flex flex-col border-l border-gray-200 dark:border-gray-700 pl-4">
            <span className="uppercase font-bold text-[10px] tracking-wider text-gray-400">Poids</span>
            <span className="font-mono text-gray-700 dark:text-gray-300">{formatFileSize(size)}</span>
          </div>
        )}
        {dimensions && (
            <div className="flex flex-col border-l border-gray-200 dark:border-gray-700 pl-4">
                <span className="uppercase font-bold text-[10px] tracking-wider text-gray-400">Ratio</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{(dimensions.width / dimensions.height).toFixed(2)}</span>
            </div>
        )}
      </div>
    </div>
  );
}
