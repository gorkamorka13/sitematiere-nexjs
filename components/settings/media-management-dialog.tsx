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
    Trash2,
    Globe,
    ArrowRight,
    Youtube,
    Link as LinkIcon,
    AlertCircle,
    PlayCircle,
    Wand2,
    Monitor,
    Zap
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
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
import { addProjectVideo, deleteProjectVideo, getProjectVideos, getSignedVideoUploadAction } from '@/app/actions/video-actions';
import type { Video as ProjectVideo } from '@prisma/client';


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
        selectedProjectId: hookProjectId,
        setSelectedProjectId: setHookProjectId,
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
    } = useSlideshow();

    // Video state
    const [videos, setVideos] = useState<ProjectVideo[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [isAddingVideo, setIsAddingVideo] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [videoTitle, setVideoTitle] = useState('');

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCountry, setSelectedCountry] = useState('');

    // Sync active tab when defaultTab changes (from external trigger)
    useEffect(() => {
        if (isOpen && defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [isOpen, defaultTab]);

    // Sync internal project ID with hook
    useEffect(() => {
        if (selectedProjectId !== hookProjectId) {
            setHookProjectId(selectedProjectId || '');
        }
    }, [selectedProjectId, hookProjectId, setHookProjectId]);

    const fetchVideos = useCallback(async () => {
        if (!selectedProjectId) return;
        setLoadingVideos(true);
        const result = await getProjectVideos(selectedProjectId);
        if (result.success && result.videos) {
            setVideos(result.videos);
        }
        setLoadingVideos(false);
    }, [selectedProjectId]);


    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId || !videoUrl) return;

        setIsAddingVideo(true);
        const result = await addProjectVideo(selectedProjectId, videoUrl, videoTitle);
        if (result.success) {
            setVideoUrl('');
            setVideoTitle('');
            fetchVideos();
            setToast({ message: 'Vidéo ajoutée avec succès', type: 'success' });
        } else {
            setToast({ message: result.error || 'Erreur lors de l\'ajout', type: 'error' });
        }
        setIsAddingVideo(false);
    };

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm('Supprimer cette vidéo ?')) return;

        const result = await deleteProjectVideo(videoId);
        if (result.success) {
            fetchVideos();
            setToast({ message: 'Vidéo supprimée', type: 'success' });
        } else {
            setToast({ message: result.error || 'Erreur', type: 'error' });
        }
    };

    const handleRetouch = useCallback(async (imageUrl: string, filename: string) => {
        setToast({ message: 'Chargement de l\'image dans l\'éditeur...', type: 'success' });
        await processor.loadImageFromUrl(imageUrl, filename);
        setActiveTab('edit');
    }, [processor, setToast]);

    // Load media when project changes
    useEffect(() => {
        if (selectedProjectId) {
            if (activeTab === 'photos') {
                loadSlideshowImages();
            } else {
                fetchVideos();
            }
        }
    }, [selectedProjectId, activeTab, loadSlideshowImages, fetchVideos]);

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
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 lg:p-8 outline-none pt-16 sm:pt-4 lg:pl-72">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            {/* Modal Body */}
            <div className="relative w-full h-full lg:h-[90vh] lg:max-w-6xl bg-white dark:bg-gray-900 lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="px-4 lg:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                            <ImageIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Gestion Média</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Configurez le diaporama et les vidéos par projet</p>
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
                                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between group ${
                                        selectedProjectId === p.id
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
                                <div className="px-4 lg:px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shrink-0">
                                    <div className="flex flex-col w-full lg:w-auto">
                                        <button
                                            onClick={() => setInternalProjectId(null)}
                                            className="lg:hidden flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-gray-600 mb-2 uppercase tracking-wider"
                                        >
                                            <ArrowRight className="w-3 h-3 rotate-180" />
                                            Retour aux projets
                                        </button>
                                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest leading-none mb-1">PROJET SÉLECTIONNÉ</span>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md">{selectedProject?.name}</h3>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex w-full lg:w-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-x-auto no-scrollbar">
                                        <button
                                            onClick={() => setActiveTab('photos')}
                                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'photos' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            <ImageIcon className="w-4 h-4 shrink-0" />
                                            PHOTOS
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('videos')}
                                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'videos' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            <VideoIcon className="w-4 h-4 shrink-0" />
                                            VIDÉOS
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('edit')}
                                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'edit' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                                        >
                                            <Wand2 className="w-4 h-4 shrink-0" />
                                            OUTILS
                                        </button>
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
                                            onAdd={() => {}} // Handle this via DatabaseImagePicker
                                            addImage={addImage}
                                            projectName={selectedProject?.name}
                                            onRetouch={handleRetouch}
                                        />
                                    ) : activeTab === 'videos' ? (
                                        <VideosTab
                                            videos={videos}
                                            loading={loadingVideos}
                                            onAdd={handleAddVideo}
                                            onDelete={handleDeleteVideo}
                                            url={videoUrl}
                                            setUrl={setVideoUrl}
                                            title={videoTitle}
                                            setTitle={setVideoTitle}
                                            isAdding={isAddingVideo}
                                            projectId={selectedProjectId}
                                            onRefresh={fetchVideos}
                                            setToast={setToast}
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">DIAPORAMA ({images.length})</h4>
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
                        onClick={() => setShowPreview(true)}
                        disabled={images.length === 0}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-4"
                    >
                        <Eye className="w-3.5 h-3.5 mr-2" />
                        TESTER
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPicker(true)}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-4 border-dashed"
                    >
                        <Plus className="w-3.5 h-3.5 mr-2" />
                        AJOUTER
                    </Button>
                    <Button
                        size="sm"
                        disabled={!hasChanges || publishing || images.length === 0}
                        onClick={onPublish}
                        className="text-[10px] font-bold tracking-widest uppercase h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                        PUBLIER
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
                                    onRemove={() => {}}
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

interface VideosTabProps {
    videos: ProjectVideo[];
    loading: boolean;
    onAdd: (e: React.FormEvent) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    url: string;
    setUrl: (url: string) => void;
    title: string;
    setTitle: (title: string) => void;
    isAdding: boolean;
    projectId: string;
    onRefresh: () => void;
    setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
}

function VideosTab({
    videos,
    loading,
    onAdd,
    onDelete,
    url,
    setUrl,
    title,
    setTitle,
    isAdding,
    projectId,
    onRefresh,
    setToast
}: VideosTabProps) {
    const [previewVideo, setPreviewVideo] = useState<ProjectVideo | null>(null);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Video Form (URL) */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <LinkIcon className="w-3.5 h-3.5" />
                        AJOUTER VIA URL (YOUTUBE, ETC.)
                    </h4>
                    <form onSubmit={onAdd} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">URL de la vidéo</label>
                            <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="url"
                                    required
                                    placeholder="https://youtube.com/..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full h-11 pl-10 pr-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Titre</label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="Ex: Drone view"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="flex-grow h-11 px-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                />
                                <Button
                                    type="submit"
                                    disabled={isAdding || !url}
                                    className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase text-[10px] tracking-widest rounded-xl shadow-lg shrink-0"
                                >
                                    {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : "AJOUTER"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Upload Video File */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-100 dark:border-gray-800">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" />
                        TÉLÉVERSER UN FICHIER VIDÉO
                    </h4>
                    <VideoDropzone
                        projectId={projectId}
                        onSuccess={() => {
                            onRefresh();
                            setToast({ message: 'Vidéo téléversée avec succès', type: 'success' });
                        }}
                        onError={(err: string) => setToast({ message: err, type: 'error' })}
                    />
                </div>
            </div>

            {/* Videos List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">LISTE DES VIDÉOS ({videos.length})</h4>
                </div>

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videos.map((vid: ProjectVideo) => (
                            <div
                                key={vid.id}
                                className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl hover:border-indigo-200 dark:hover:border-indigo-800 transition-all hover:shadow-md"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center shrink-0">
                                        {vid.url.includes('youtube') ? (
                                            <Youtube className="w-6 h-6 text-red-600" />
                                        ) : (
                                            <VideoIcon className="w-6 h-6 text-red-600" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{vid.title}</p>
                                        <a
                                            href={vid.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-gray-400 hover:text-indigo-600 truncate block transition-colors"
                                        >
                                            {vid.url}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPreviewVideo(vid)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                                        title="Lire la vidéo"
                                    >
                                        <PlayCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => onDelete(vid.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                        title="Supprimer la vidéo"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <HelpNote />

            {/* Video Player Preview Overlay */}
            {previewVideo && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setPreviewVideo(null)}>
                    <div className="relative max-w-5xl w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewVideo(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="absolute top-4 left-6 z-10 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl">
                            <h3 className="text-white font-bold text-sm">{previewVideo?.title}</h3>
                        </div>
                        <video
                            src={previewVideo?.url}
                            controls
                            autoPlay
                            className="w-full h-full"
                        >
                            Votre navigateur ne supporte pas la lecture de vidéos.
                        </video>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponent: VideoDropzone
interface VideoDropzoneProps {
    projectId: string;
    onSuccess: () => void;
    onError: (err: string) => void;
}

function VideoDropzone({ projectId, onSuccess, onError }: VideoDropzoneProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setProgress(0);

        try {
            // 1. Get signed URL
            const result = await getSignedVideoUploadAction(projectId, file.name, file.type);

            if (!result.success || !result.signedUrl || !result.publicUrl) {
                throw new Error(result.error || "Impossible de préparer l'envoi");
            }

            // 2. Upload to R2 directly with XHR to track progress
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', result.signedUrl!);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) resolve(true);
                    else reject(new Error(`Erreur lors de l'envoi (${xhr.status})`));
                };

                xhr.onerror = () => reject(new Error("Erreur réseau lors de l'envoi"));
                xhr.send(file);
            });

            // 3. Register in database
            const saveResult = await addProjectVideo(projectId, result.publicUrl, file.name.replace(/\.[^/.]+$/, ""));

            if (!saveResult.success) {
                throw new Error(saveResult.error || "Erreur lors de l'enregistrement en base de données");
            }

            onSuccess();
        } catch (err: unknown) {
            console.error("Upload error:", err);
            onError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'envoi");
        } finally {
            setUploading(false);
            setProgress(0);
        }
    }, [projectId, onSuccess, onError]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.webm', '.m4v']
        },
        maxFiles: 1,
        disabled: uploading
    });

    return (
        <div
            {...getRootProps()}
            className={`relative flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' :
                uploading ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed' :
                'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
        >
            <input {...getInputProps()} />

            {uploading ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="absolute text-[10px] font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">ENVOI EN COURS...</p>
                    <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                        <VideoIcon className={`w-5 h-5 ${isDragActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {isDragActive ? 'Déposez la vidéo ici' : 'Glissez une vidéo ou cliquez'}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-1">MP4, MOV, AVI, WEBM (Max 500MB)</p>
                    </div>
                </div>
            )}
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
            console.error("Save error:", error);
            alert(error instanceof Error ? error.message : "Une erreur est survenue");
        } finally {
            setIsSaving(false);
        }
    }, [processor.currentImage, processor.originalImage, projectId, onSuccess]);

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

function HelpNote() {
    return (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
                <p className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">Conseil d&apos;intégration</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                    Pour un affichage optimal, privilégiez les liens YouTube (format long ou Short) ou des liens directs vers des fichiers .mp4. Les vidéos seront automatiquement lues dans la galerie média du Dashboard.
                </p>
            </div>
        </div>
    );
}
