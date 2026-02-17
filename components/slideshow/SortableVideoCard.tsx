'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, CheckCircle2, Clock, Video, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SortableVideoCardProps {
  id: string;
  video: {
    id: string;
    url: string;
    title: string | null;
  };
  isPublished: boolean;
  onRemove: () => void;
  onTogglePublish: () => void;
}

export function SortableVideoCard({
  id,
  video,
  isPublished,
  onRemove,
  onTogglePublish,
}: SortableVideoCardProps) {
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

  // Extract video ID for thumbnail if possible (basic support for YT/Vimeo)
  const getThumbnail = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://img.youtube.com/vi/${videoId}/default.jpg`;
    }
    return null;
  };

  const thumbnailUrl = getThumbnail(video.url);

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

        {/* Video Preview/Icon */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={video.title || "Video thumbnail"}
              className="w-full h-full object-cover"
            />
          ) : (
            <Video className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Mobile Info */}
        <div className="flex-1 min-w-0 sm:hidden">
          <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">
            {video.title || 'Vidéo sans titre'}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {video.url}
          </p>
        </div>
      </div>

      {/* Desktop Info */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {video.title || 'Vidéo sans titre'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {video.url}
        </p>
      </div>

      {/* Status Badge & Toggle */}
      <div className="flex items-center gap-2">
        <button
            onClick={onTogglePublish}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                isPublished
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            }`}
            title={isPublished ? "Masquer la vidéo" : "Publier la vidéo"}
        >
            {isPublished ? (
                <>
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider hidden sm:inline">
                        Publié
                    </span>
                </>
            ) : (
                <>
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-300" />
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider hidden sm:inline">
                        Brouillon
                    </span>
                </>
            )}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <div className="relative">
        <Button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();

            // Toggle confirmation state locally
            const button = e.currentTarget;
            if (button.getAttribute('data-confirm') === 'true') {
              button.setAttribute('data-confirm', 'false');
              onRemove();
            } else {
              button.setAttribute('data-confirm', 'true');
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
