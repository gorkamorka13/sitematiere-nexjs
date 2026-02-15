'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlideshowViewer } from './SlideshowViewer';

interface SlideshowImage {
  id: string;
  image: {
    url: string;
    alt: string | null;
  };
}

interface SlideshowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: SlideshowImage[];
  projectName?: string;
}

export function SlideshowPreviewModal({
  isOpen,
  onClose,
  images,
  projectName
}: SlideshowPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1050] bg-black/95 flex flex-col animate-in fade-in duration-300">
      {/* Close Button Overlay */}
      <div className="absolute top-6 right-6 z-[110]">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full h-12 w-12"
        >
          <X className="w-8 h-8" />
        </Button>
      </div>

      <div className="flex-grow flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl">
          <SlideshowViewer images={images} projectName={projectName} />
        </div>
      </div>

      <div className="p-6 text-center text-white/40 text-xs font-medium uppercase tracking-widest bg-gradient-to-t from-black to-transparent">
        Mode aperçu - Appuyez sur Échap pour quitter
      </div>
    </div>
  );
}
