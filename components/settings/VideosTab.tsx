'use client';

import { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Loader2, Video as VideoIcon, Upload, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableVideoCard } from '@/components/slideshow/SortableVideoCard';
import { VideoDropzone } from './VideoDropzone';
import { VideoPreviewModal } from './VideoPreviewModal';
import { SlideshowVideo } from '@/hooks/use-slideshow-video';
import { DatabaseVideoPicker } from '@/components/video/DatabaseVideoPicker';

interface VideosTabProps {
    videos: SlideshowVideo[];
    loading: boolean;
    publishing: boolean;
    hasChanges: boolean;
    onPublish: () => void;
    onUnpublish: () => void;
    onRemove: (id: string) => Promise<boolean>;
    onReorder: (oldIndex: number, newIndex: number) => void;
    onAdd: (url: string, title: string) => Promise<boolean>;
    onTogglePublish: (id: string) => void;
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
    projectId: string;
}

export function VideosTab({
    videos,
    loading,
    publishing,
    hasChanges,
    onPublish,
    onUnpublish,
    onRemove,
    onReorder,
    onAdd,
    onTogglePublish,
    setToast,
    projectId
}: VideosTabProps) {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [previewVideo, setPreviewVideo] = useState<{ id: string, url: string, title: string | null } | null>(null);
    const [showDatabasePicker, setShowDatabasePicker] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (over && active.id !== over.id) {
            const oldIndex = videos.findIndex((item) => item.id === active.id);
            const newIndex = videos.findIndex((item) => item.id === over.id);
            onReorder(oldIndex, newIndex);
        }
    };

    const handleUploadSuccess = async (url: string, title: string) => {
        const success = await onAdd(url, title);
        if (success) {
            setToast({ message: 'Vidéo ajoutée avec succès !', type: 'success' });
        } else {
            // Error handling is done in hook usually, but we can double check
        }
    };

    const activeVideo = activeId ? videos.find(v => v.id === activeId) : null;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">LISTE DES VIDÉOS ({videos.length})</h4>
                    {hasChanges && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800/30">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            CHANGEMENTS NON PUBLIÉS
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     <Button
                        size="sm"
                        variant="outline"
                        onClick={onUnpublish}
                        disabled={videos.length === 0 || publishing}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-4 hidden sm:flex"
                    >
                         TOUT DÉPUBLIER
                    </Button>
                    <Button
                        size="sm"
                        disabled={!hasChanges || publishing || videos.length === 0}
                        onClick={onPublish}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto"
                    >
                        {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                        TOUT PUBLIER
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Upload Video File */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <Upload className="w-3.5 h-3.5" />
                            AJOUTER UNE VIDÉO
                        </h4>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowDatabasePicker(true)}
                            className="bg-white dark:bg-gray-900 text-[10px] font-bold h-7"
                        >
                            <Database className="w-3 h-3 mr-2" />
                            BIBLIOTHÈQUE (R2)
                        </Button>
                    </div>
                    <VideoDropzone
                        projectId={projectId}
                        onUpload={handleUploadSuccess}
                        onError={(err: string) => setToast({ message: err, type: 'error' })}
                    />
                </div>
            </div>

            {/* Videos List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                        <p className="text-xs">Chargement des vidéos...</p>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="py-16 text-center text-gray-400">
                        <VideoIcon className="w-12 h-12 mb-4 mx-auto opacity-10" />
                        <p className="text-sm">Aucune vidéo liée à ce projet</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {videos.map((video) => (
                                    <div key={video.id} onClick={() => setPreviewVideo(video)} className="cursor-pointer">
                                        <SortableVideoCard
                                            id={video.id}
                                            video={video}
                                            isPublished={video.isPublished}
                                            onRemove={() => onRemove(video.id)}
                                            onTogglePublish={() => onTogglePublish(video.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                        <DragOverlay>
                            {activeVideo ? (
                                <div className="scale-[1.02] shadow-2xl opacity-90 ring-2 ring-indigo-500 bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
                                     <SortableVideoCard
                                        id={activeVideo.id}
                                        video={activeVideo}
                                        isPublished={activeVideo.isPublished}
                                        onRemove={() => {}}
                                        onTogglePublish={() => {}}
                                    />
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>

            <VideoPreviewModal
                video={previewVideo}
                onClose={() => setPreviewVideo(null)}
            />

            <DatabaseVideoPicker
                isOpen={showDatabasePicker}
                onClose={() => setShowDatabasePicker(false)}
                onSelect={(url, filename) => {
                    handleUploadSuccess(url, filename.replace(/\.[^/.]+$/, ""));
                }}
                initialProjectFilter={projectId}
            />
        </div>
    );
}
