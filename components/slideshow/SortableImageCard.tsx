'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeImageUrl } from '@/lib/utils/image-url';

interface SortableImageCardProps {
  id: string;
  image: {
    id: string;
    url: string;
    alt: string | null;
  };
  order: number;
  isPublished: boolean;
  onRemove: () => void;
}

export function SortableImageCard({
  id,
  image,
  order,
  isPublished,
  onRemove,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl transition-all ${isDragging ? 'shadow-2xl scale-105 z-50' : 'hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <GripVertical className="w-5 h-5 text-gray-400" />
      </div>

      {/* Order Number */}
      <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-sm">
        {order}
      </div>

      {/* Image Preview */}
      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
        <img
          src={normalizeImageUrl(image.url)}
          alt={image.alt || `Image ${order}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Image Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {image.alt || 'Sans titre'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {image.url.split('/').pop()}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {isPublished ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
              Publié
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Brouillon
            </span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <Button
        onClick={onRemove}
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
