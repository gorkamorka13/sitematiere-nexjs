'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { ImageData } from '@/types/image-processor';

interface DropZoneProps {
  onImageLoad: (file: File) => void;
  isLoading?: boolean;
}

export function DropZone({ onImageLoad, isLoading }: DropZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onImageLoad(acceptedFiles[0]);
    }
  }, [onImageLoad]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    disabled: isLoading
  });

  return (
    <div
      {...getRootProps()}
      className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ease-in-out
        ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]' : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500'}
        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center space-y-4">
        {isLoading ? (
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        ) : (
          <div className={`p-4 rounded-full ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
            <Upload className="w-8 h-8" />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {isDragActive ? "Déposez l'image ici..." : "Glissez-déposez une image ici"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ou cliquez pour sélectionner un fichier (JPG, PNG, WebP)
          </p>
        </div>
      </div>
    </div>
  );
}
