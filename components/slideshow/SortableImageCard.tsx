'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
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
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl transition-all ${isDragging ? 'shadow-2xl scale-[1.02] z-50 bg-white dark:bg-gray-800' : 'hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
        >
          <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
        </div>

        {/* Image Preview - Smaller on mobile */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
          <Image
            src={normalizeImageUrl(image.url)}
            alt={image.alt || `Image`}
            fill
            sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
            className="object-cover"
          />
        </div>

        {/* Image Info - Mobile only layout part */}
        <div className="flex-1 min-w-0 sm:hidden">
          <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">
            {image.alt || 'Sans titre'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {image.url.split('/').pop()}
          </p>
        </div>
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

      {/* Remove Button - Two-step confirmation logic */}
      <div className="relative">
        <Button
          type="button"
          onMouseDown={(e) => {
            console.log('[SortableImageCard] onMouseDown trash:', id);
            e.stopPropagation();
          }}
          onClick={(e) => {
            console.log('[SortableImageCard] onClick trash:', id);
            e.stopPropagation();
            e.preventDefault();

            // Toggle confirmation state locally
            const button = e.currentTarget;
            if (button.getAttribute('data-confirm') === 'true') {
              console.log('[SortableImageCard] Second click - confirmed removal');
              button.setAttribute('data-confirm', 'false');
              onRemove();
            } else {
              console.log('[SortableImageCard] First click - asking for confirmation');
              button.setAttribute('data-confirm', 'true');

              // Reset after 4 seconds if not clicked again
              setTimeout(() => {
                if (button) button.setAttribute('data-confirm', 'false');
              }, 4000);
            }
          }}
          variant="ghost"
          size="sm"
          className="group relative flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer z-50 px-3 data-[confirm=true]:bg-red-600 data-[confirm=true]:text-white data-[confirm=true]:hover:bg-red-700"
          data-confirm="false"
        >
          <Trash2 className="w-4 h-4" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-bold uppercase transition-all group-data-[confirm=true]:max-w-[100px] group-data-[confirm=true]:ml-1">
            Supprimer ?
          </span>
        </Button>
      </div>
    </div>
  );
}
