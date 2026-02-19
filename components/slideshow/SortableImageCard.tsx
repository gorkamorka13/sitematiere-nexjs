'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, CheckCircle2, Clock, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/utils/image-url';
import { useLogger } from '@/lib/logger';

interface SortableImageCardProps {
  id: string;
  image: {
    id: string;
    url: string;
    thumbnailUrl?: string | null;
    alt: string | null;
  };
  isPublished: boolean;
  onRemove: () => void;
  onEdit?: () => void;
}

export function SortableImageCard({
  id,
  image,
  isPublished,
  onRemove,
  onEdit,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const logger = useLogger('SortableImageCard');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/card flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-4 bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl transition-all duration-300 ${isDragging ? 'shadow-2xl scale-[1.02] z-50 ring-2 ring-indigo-500/50' : 'hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-800 hover:-translate-y-0.5'
        }`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0 text-gray-400 hover:text-indigo-500"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Image Preview */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 flex-shrink-0 shadow-inner group-hover/card:scale-105 transition-transform duration-500">
          <Image
            src={normalizeImageUrl(image.thumbnailUrl || image.url)}
            alt={image.alt || `Image`}
            fill
            sizes="(max-width: 640px) 80px, 96px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Image Info */}
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-black text-gray-900 dark:text-white truncate tracking-tight">
          {image.alt || 'Sans titre'}
        </p>
        <p className="text-[10px] font-mono text-gray-400 truncate mt-1 opactiy-60 uppercase tracking-widest">
          {image.url.split('/').pop()}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center sm:justify-center shrink-0">
        {isPublished ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">
              Live
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-full">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
              Draft
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {onEdit && (
            <Button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 h-9"
            >
                <Wand2 className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase">Retoucher</span>
            </Button>
        )}

        {/* Remove Button - Two-step confirmation logic */}
        <div className="relative">
        <Button
          type="button"
          onMouseDown={(e) => {
            logger.debug('onMouseDown trash:', id);
            e.stopPropagation();
          }}
          onClick={(e) => {
            logger.debug('onClick trash:', id);
            e.stopPropagation();
            e.preventDefault();

            // Toggle confirmation state locally
            const button = e.currentTarget;
            if (button.getAttribute('data-confirm') === 'true') {
              logger.info('Confirmed removal');
              button.setAttribute('data-confirm', 'false');
              onRemove();
            } else {
              logger.info('Asking for confirmation');
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
    </div>
  );
}
