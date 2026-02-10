'use client';

import { HistoryItem } from '@/types/image-processor';
import { Button } from '@/components/ui/button';
import { RotateCcw, Trash2, Clock } from 'lucide-react';
import { formatFileSize } from '@/lib/image-utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface HistoryProps {
  items: HistoryItem[];
  onSelect: (index: number) => void;
  onClear: () => void;
}

export function History({ items, onSelect, onClear }: HistoryProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" /> Historique
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-3 h-3 mr-1" /> Effacer
        </Button>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, index) => (
                <li key={item.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-4 group">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>

                    {/* Info */}
                    <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.action}</span>
                            <span className="text-[10px] text-gray-400">
                                {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: fr })}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.details}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(item.imageData.size)}</p>
                    </div>

                    {/* Action */}
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onSelect(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <RotateCcw className="w-3 h-3 mr-1" /> Restaurer
                    </Button>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
