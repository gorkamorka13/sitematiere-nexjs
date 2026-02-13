'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeImageUrl } from '@/lib/utils/image-url';

interface SlideshowImage {
  id: string;
  image: {
    url: string;
    alt: string | null;
  };
}

interface SlideshowViewerProps {
  images: SlideshowImage[];
  projectName?: string;
}

export function SlideshowViewer({ images, projectName }: SlideshowViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      goToNext();
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [isPlaying, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsFullscreen(false);
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrevious]);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
        <div className="text-center px-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600 mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Aucune image
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            Ce diaporama ne contient aucune image pour le moment.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Le slideshow n&apos;a pas encore été publié ou ne contient pas d&apos;images.
          </p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-black' : 'relative'}`}>
      {/* Header */}
      {projectName && !isFullscreen && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{projectName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Slideshow - {images.length} image{images.length > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Main Image Container */}
      <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[70vh]'} bg-gray-900 rounded-2xl overflow-hidden group`}>
        {/* Image */}
        <img
          src={normalizeImageUrl(currentImage.image.url)}
          alt={currentImage.image.alt || `Image ${currentIndex + 1}`}
          className="w-full h-full object-contain"
        />

        {/* Overlay Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                {currentIndex + 1} / {images.length}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsPlaying(!isPlaying)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>

              {isFullscreen && (
                <Button
                  onClick={() => setIsFullscreen(false)}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Bottom Info */}
          {currentImage.image.alt && (
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-white text-lg font-medium text-center">
                {currentImage.image.alt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {!isFullscreen && images.length > 1 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setCurrentIndex(index)}
              className={`relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden transition-all ${index === currentIndex
                ? 'ring-4 ring-indigo-500 scale-110'
                : 'opacity-60 hover:opacity-100'
                }`}
            >
              <img
                src={normalizeImageUrl(img.image.url)}
                alt={img.image.alt || `Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === currentIndex && (
                <div className="absolute inset-0 bg-indigo-500/20" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Toggle */}
      {!isFullscreen && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setIsFullscreen(true)}
            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 active:scale-95 transition-all font-bold uppercase tracking-widest text-xs px-8"
          >
            Plein écran
          </Button>
        </div>
      )}
    </div>
  );
}
