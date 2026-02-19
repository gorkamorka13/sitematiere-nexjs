'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    X,
    Search,
    ImageIcon,
    Video as VideoIcon,
    Plus,
    Loader2,
    Upload,
    Eye,
    Globe,
    ArrowRight,
    Wand2,
    Monitor,
    Zap
} from 'lucide-react';
// import { useDropzone } from 'react-dropzone'; // Removed unused
import { Button } from '@/components/ui/button';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { DropZone } from '@/components/image-processor/DropZone';
import { Controls } from '@/components/image-processor/Controls';
import { CropTool } from '@/components/image-processor/CropTool';
import { ImagePreview } from '@/components/image-processor/ImagePreview';
import { Comparison } from '@/components/image-processor/Comparison';
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
import { SortableImageCard } from '@/components/slideshow/SortableImageCard';
import { SlideshowPreviewModal } from '@/components/slideshow/SlideshowPreviewModal';
import { DatabaseImagePicker } from '@/components/image-processor/DatabaseImagePicker';
import { Toast } from '@/components/ui/toast';
import { useSlideshow, SlideshowImage } from '@/hooks/use-slideshow';
import { useSlideshowVideo } from '@/hooks/use-slideshow-video';
import { useLogger } from '@/lib/logger';
import { VideosTab } from './VideosTab';

interface Project {
    id: string;
    name: string;
    country: string | null;
}

interface MediaManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projects: Project[];
    defaultTab?: 'photos' | 'videos' | 'edit';
}

export default function MediaManagementDialog({ isOpen, onClose, projects, defaultTab = 'photos' }: MediaManagementDialogProps) {
    const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'edit'>(defaultTab);
    const [selectedProjectId, setInternalProjectId] = useState<string | null>(null);

    // Image Processor hook
    const processor = useImageProcessor();

    // Slideshow state
    const {
        slideshowImages,
        loading: loadingSlideshow,
        publishing,
        hasUnpublishedChanges,
        toast,
        setToast,
        loadSlideshowImages,
        addImage,
        removeImage,
        reorderImages,
        publish
    } = useSlideshow(selectedProjectId);

    // Video state hook
    const {
        videos,
        loading: loadingVideos,
        publishing: publishingVideos,
        hasUnpublishedChanges: hasVideoChanges,
        toast: videoToast,
        setToast: setVideoToast,
        addVideo,
        removeVideo,
        reorderVideos,
        publish: publishVideos,
        unpublish: unpublishVideos,
        togglePublish: toggleVideoPublish
    } = useSlideshowVideo(selectedProjectId);

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');

    // Sync active tab when defaultTab changes (from external trigger)
    useEffect(() => {
        if (isOpen && defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);

    const handleRetouch = useCallback(async (imageUrl: string, filename: string) => {
        setToast({ message: 'Chargement de l\'image dans l\'éditeur...', type: 'success' });
        await processor.loadImageFromUrl(imageUrl, filename);
        setActiveTab('edit');
    }, [processor, setToast]);

    // Consolidate toasts
    useEffect(() => {
        if (videoToast) {
            setToast(videoToast);
            setVideoToast(null);
        }
    }, [videoToast, setToast, setVideoToast]);


    // Filter logic
    const countries = useMemo(() => {
        return Array.from(new Set(
            projects
                .map(p => p.country)
                .filter(Boolean)
                .filter(c => c !== "Système")
        )).sort() as string[];
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (p.country === "Système") return false;
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCountry = !selectedCountry || p.country === selectedCountry;
            return matchesSearch && matchesCountry;
        });
    }, [projects, searchQuery, selectedCountry]);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 lg:p-8">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal Body */}
            <div className="relative w-full h-full lg:h-[90vh] lg:max-w-6xl bg-white dark:bg-gray-900 lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="px-4 lg:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <ImageIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg lg:text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Gestion Média</h2>
                            <p className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:block uppercase tracking-wider">Configurez le diaporama et les vidéos par projet</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-grow flex overflow-hidden relative">
                    {/* Sidebar: Projects List */}
                    <div className={`
                        w-full lg:w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/30 dark:bg-gray-900/30 shrink-0 transition-all duration-300 absolute inset-0 z-20 lg:static lg:z-auto
                        ${selectedProjectId ? 'translate-x-full lg:translate-x-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto' : 'translate-x-0 opacity-100'}
                    `}>
                        <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-800">
                            {/* Filters */}
                            <div className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Chercher un projet..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-10 pl-9 pr-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="w-full h-10 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                                >
                                    <option value="">Tous les pays</option>
                                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Project List */}
                        <div className="flex-grow overflow-y-auto p-2 space-y-1">
                            {filteredProjects.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setInternalProjectId(p.id)}
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${selectedProjectId === p.id
                                        ? 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none text-white'
                                        : 'hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{p.name}</p>
                                        <p className={`text-[10px] uppercase tracking-wider ${selectedProjectId === p.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                            {p.country || 'International'}
                                        </p>
                                    </div>
                                    <ArrowRight className={`w-4 h-4 transition-transform ${selectedProjectId === p.id ? 'translate-x-0' : '-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                                </button>
                            ))}
                            {filteredProjects.length === 0 && (
                                <div className="py-8 text-center px-4">
                                    <p className="text-sm text-gray-500 italic">Aucun projet trouvé</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-grow flex flex-col overflow-hidden bg-white dark:bg-gray-900 w-full">
                        {!selectedProjectId ? (
                            <div className="flex-grow hidden lg:flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800/50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Globe className="w-10 h-10 opacity-20" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sélectionnez un projet</h3>
                                <p className="text-sm max-w-xs">Choisissez un projet dans la liste de gauche pour gérer ses médias.</p>
                            </div>
                        ) : (
                            <>
                                {/* Project Toolbar */}
                                <div className="px-4 lg:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
                                    <div className="flex flex-col min-w-0">
                                        <button
                                            onClick={() => setInternalProjectId(null)}
                                            className="lg:hidden flex items-center gap-2 text-[10px] font-bold text-gray-400 hover:text-indigo-600 mb-3 uppercase tracking-widest transition-colors"
                                        >
                                            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                                            Projets
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.2em] leading-none mb-1.5 opacity-80">SÉLECTION</span>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white truncate lg:max-w-md drop-shadow-sm">{selectedProject?.name}</h3>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex p-1.5 bg-gray-200/50 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/30 dark:border-gray-700/50 overflow-x-auto no-scrollbar shadow-inner">
                                        {[
                                            { id: 'photos', icon: ImageIcon, label: 'PHOTOS' },
                                            { id: 'videos', icon: VideoIcon, label: 'VIDÉOS' },
                                            { id: 'edit', icon: Wand2, label: 'OUTILS' }
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex-1 lg:flex-none flex items-center justify-center gap-2.5 px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                                    ? 'bg-white dark:bg-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-none text-indigo-600 dark:text-indigo-400 scale-100'
                                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 scale-95 opacity-70 hover:opacity-100'
                                                    }`}
                                            >
                                                <tab.icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-grow overflow-y-auto p-4 lg:p-6">
                                    {activeTab === 'photos' ? (
                                        <SlideshowTab
                                            images={slideshowImages}
                                            loading={loadingSlideshow}
                                            publishing={publishing}
                                            hasChanges={hasUnpublishedChanges}
                                            onPublish={publish}
                                            onRemove={removeImage}
                                            onReorder={reorderImages}
                                            onAdd={() => { }} // Handle this via DatabaseImagePicker
                                            addImage={addImage}
                                            projectName={selectedProject?.name}
                                            onRetouch={handleRetouch}
                                        />
                                    ) : activeTab === 'videos' ? (
                                        <VideosTab
                                            videos={videos}
                                            loading={loadingVideos}
                                            publishing={publishingVideos}
                                            hasChanges={hasVideoChanges}
                                            onPublish={publishVideos}
                                            onUnpublish={unpublishVideos}
                                            onRemove={removeVideo}
                                            onReorder={reorderVideos}
                                            onAdd={addVideo}
                                            onTogglePublish={toggleVideoPublish}
                                            setToast={setToast}
                                            projectId={selectedProjectId}
                                        />
                                    ) : (
                                        <EditTab
                                            processor={processor}
                                            projectId={selectedProjectId}
                                            onSuccess={() => {
                                                loadSlideshowImages();
                                                setActiveTab('photos');
                                            }}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Integration */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

// Subcomponents to keep it clean

interface SlideshowTabProps {
    images: SlideshowImage[];
    loading: boolean;
    publishing: boolean;
    hasChanges: boolean;
    onPublish: () => void;
    onRemove: (id: string) => void;
    onReorder: (oldIndex: number, newIndex: number) => void;
    onAdd: () => void;
    addImage: (url: string, name: string, fileId: string) => Promise<boolean>;
    projectName?: string;
    onRetouch: (url: string, filename: string) => void;
}

function SlideshowTab({
    images,
    loading,
    publishing,
    hasChanges,
    onPublish,
    onRemove,
    onReorder,
    addImage,
    projectName,
    onRetouch
}: SlideshowTabProps) {
    const [showPicker, setShowPicker] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);

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
            const oldIndex = images.findIndex((item: SlideshowImage) => item.id === active.id);
            const newIndex = images.findIndex((item: SlideshowImage) => item.id === over.id);
            onReorder(oldIndex, newIndex);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider shrink-0">DIAPORAMA ({images.length})</h4>
                    {hasChanges && (
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-bold text-amber-600 dark:text-amber-400 rounded-full border border-amber-100 dark:border-amber-800/30 shrink-0">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            CHANGEMENTS NON PUBLIÉS
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPreview(true)}
                        disabled={images.length === 0}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-3 sm:px-4"
                        title="Tester le diaporama"
                    >
                        <Eye className="w-3.5 h-3.5 sm:mr-2" />
                        <span className="hidden sm:inline">TESTER</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPicker(true)}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-3 sm:px-4 border-dashed"
                        title="Ajouter des photos"
                    >
                        <Plus className="w-3.5 h-3.5 sm:mr-2" />
                        <span className="hidden sm:inline">AJOUTER</span>
                    </Button>
                    <Button
                        size="sm"
                        disabled={!hasChanges || publishing || images.length === 0}
                        onClick={onPublish}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                        title="Publier les modifications"
                    >
                        {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin sm:mr-2" /> : <Upload className="w-3.5 h-3.5 sm:mr-2" />}
                        <span className="hidden sm:inline">PUBLIER</span>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                    <p className="text-sm">Chargement des photos...</p>
                </div>
            ) : images.length === 0 ? (
                <div className="py-20 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/50">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm font-medium">Aucune photo dans le diaporama</p>
                    <button onClick={() => setShowPicker(true)} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">
                        Ajouter la première photo
                    </button>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={images.map((img: SlideshowImage) => img.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {images.map((img: SlideshowImage) => (
                                <SortableImageCard
                                    key={img.id}
                                    id={img.id}
                                    image={img.image}
                                    isPublished={img.isPublished}
                                    onRemove={() => onRemove(img.id)}
                                    onEdit={() => onRetouch(img.image.url, img.image.alt || 'photo.jpg')}
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <div className="scale-[1.02] shadow-2xl opacity-90 ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 rounded-xl overflow-hidden">
                                <SortableImageCard
                                    id={activeId}
                                    image={images.find((img: SlideshowImage) => img.id === activeId)!.image}
                                    isPublished={images.find((img: SlideshowImage) => img.id === activeId)!.isPublished}
                                    onRemove={() => { }}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <DatabaseImagePicker
                isOpen={showPicker}
                onClose={() => setShowPicker(false)}
                onSelect={async (url, name, fileId) => {
                    await addImage(url, name, fileId);
                    setShowPicker(false);
                }}
            />

            <SlideshowPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                images={images}
                projectName={projectName}
            />
        </div>
    );
}



interface EditTabProps {
    processor: ReturnType<typeof useImageProcessor>;
    projectId: string | null;
    onSuccess: () => void;
}

function EditTab({ processor, projectId, onSuccess }: EditTabProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [showDatabasePicker, setShowDatabasePicker] = useState(false);
    const logger = useLogger('EditTab');

    const handleSaveToDatabase = useCallback(async () => {
        if (!processor.currentImage || !projectId) return;
        setIsSaving(true);

        try {
            // Get the image data
            const res = await fetch(processor.currentImage.src);
            if (!res.ok) throw new Error("Failed to fetch image data");
            const actualBlob = await res.blob();

            // Prepare filename
            const ext = processor.currentImage.src.split(';')[0].split('/')[1] || 'png';
            const baseName = processor.originalImage?.file?.name.replace(/\.[^/.]+$/, "") || `edit_${Date.now()}`;
            const filename = `mod_${baseName}.${ext}`;

            const file = new File([actualBlob], filename, { type: actualBlob.type });

            // Upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectId);

            const uploadRes = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });

            const result = await uploadRes.json();
            if (result.success && result.files && result.files.length > 0) {
                // Add to slideshow
                const { addImageToSlideshow } = await import('@/app/actions/slideshow-actions');
                const addRes = await addImageToSlideshow(projectId, result.files[0].id);

                if (addRes.success) {
                    onSuccess();
                } else {
                    throw new Error(addRes.error || "Erreur lors de l'ajout au diaporama");
                }
            } else {
                throw new Error(result.error || "Erreur lors du téléversement");
            }
        } catch (error) {
            logger.error("Save error:", error);
            alert(error instanceof Error ? error.message : "Une erreur est survenue");
        } finally {
            setIsSaving(false);
        }
    }, [processor.currentImage, processor.originalImage, projectId, onSuccess, logger]);

    // Override the global dispatchUploadEvent for the Controls component
    useEffect(() => {
        window.dispatchUploadEvent = handleSaveToDatabase;
        return () => {
            window.dispatchUploadEvent = undefined;
        };
    }, [handleSaveToDatabase]);

    if (!processor.originalImage) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-12">
                <DropZone onImageLoad={processor.loadImage} isLoading={processor.isProcessing} />
                <div className="mt-8 flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowDatabasePicker(true)}
                        className="text-xs font-bold uppercase tracking-widest px-6 h-11 border-dashed"
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        BIBLIOTHÈQUE (R2)
                    </Button>
                </div>

                <DatabaseImagePicker
                    isOpen={showDatabasePicker}
                    onClose={() => setShowDatabasePicker(false)}
                    onSelect={(url) => {
                        processor.loadImageFromUrl(url, url.split('/').pop() || 'image.jpg');
                        setShowDatabasePicker(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6 relative h-full flex flex-col">
            {/* Status & Validation Bar */}
            {processor.processedImage && (
                <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex flex-col items-start px-2">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Aperçu des modifications</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {processor.processedImage.tempAction} : {processor.processedImage.tempDetails}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={processor.cancelProcessedImage} className="text-xs font-bold uppercase tracking-wider">
                            Annuler
                        </Button>
                        <Button size="sm" onClick={processor.commitProcessedImage} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider">
                            Valider
                        </Button>
                    </div>
                </div>
            )}

            {isSaving && (
                <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                        <p className="font-bold text-gray-900">Enregistrement...</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow ">
                <div className="lg:col-span-1 space-y-4">
                    <Controls
                        originalDimensions={processor.currentImage ? { width: processor.currentImage.width, height: processor.currentImage.height } : null}
                        onResize={processor.resizeImageAction}
                        onCrop={processor.enableCrop}
                        onDownload={processor.downloadImage}
                        onUndo={processor.undo}
                        onRedo={processor.redo}
                        canUndo={processor.canUndo}
                        canRedo={processor.canRedo}
                        isProcessing={processor.isProcessing}
                    />

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-widest">MODE ÉDITION</span>
                        </div>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                            Vous travaillez sur une copie. Cliquez sur &quot;Sur la Base&quot; pour enregistrer et ajouter l&apos;image au diaporama.
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        onClick={processor.reset}
                        className="w-full text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-red-500 hover:bg-red-50"
                    >
                        Abandonner l&apos;édition
                    </Button>
                </div>

                <div className="lg:col-span-2 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800/50 overflow-hidden min-h-[500px]">
                    <div className="flex-grow p-4 lg:p-8 flex items-center justify-center">
                        {processor.processedImage ? (
                            <Comparison original={processor.originalImage} processed={processor.processedImage} />
                        ) : (
                            processor.currentImage && (
                                <ImagePreview
                                    imageSrc={processor.currentImage.src}
                                    title="Résultat actuel"
                                    size={processor.currentImage.size}
                                    dimensions={{ width: processor.currentImage.width, height: processor.currentImage.height }}
                                    filename={processor.originalImage.file.name}
                                />
                            )
                        )}
                    </div>

                    <div className="px-6 py-4 bg-white/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Monitor className="w-4 h-4 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Aperçu temps réel</span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400">
                            {processor.currentImage?.width}x{processor.currentImage?.height} • {Math.round((processor.currentImage?.size || 0) / 1024)} KB
                        </div>
                    </div>
                </div>
            </div>

            {/* Crop Overlay */}
            {processor.isCropping && processor.currentImage && (
                <div className="absolute inset-0 z-[120] bg-black/80 backdrop-blur-sm rounded-3xl overflow-hidden animate-in fade-in duration-300">
                    <CropTool
                        imageSrc={processor.currentImage.src}
                        onApply={processor.applyCrop}
                        onCancel={processor.cancelCrop}
                    />
                </div>
            )}

            {/* Database Picker */}
            <DatabaseImagePicker
                isOpen={showDatabasePicker}
                onClose={() => setShowDatabasePicker(false)}
                onSelect={(url) => {
                    processor.loadImageFromUrl(url, url.split('/').pop() || 'image.jpg');
                    setShowDatabasePicker(false);
                }}
            />
        </div>
    );
}


