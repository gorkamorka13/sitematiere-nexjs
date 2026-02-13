'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Save, Upload, Eye, Search, X } from 'lucide-react';
import { DatabaseImagePicker } from '@/components/image-processor/DatabaseImagePicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableImageCard } from '@/components/slideshow/SortableImageCard';
import {
  getSlideshowImages,
  removeSlideshowImage,
  reorderSlideshowImages,
  publishSlideshow,
  addImageToSlideshow,
} from '@/app/actions/slideshow-actions';
import { SlideshowPreviewModal } from './SlideshowPreviewModal';
import { Toast, ToastType } from '@/components/ui/toast';

interface SlideshowImage {
  id: string;
  imageId: string;
  order: number;
  isPublished: boolean;
  image: {
    id: string;
    url: string;
    alt: string | null;
  };
}

interface Project {
  id: string;
  name: string;
  country: string | null;
}

interface SlideshowManagerProps {
  projects: Project[];
}

export function SlideshowManager({ projects }: SlideshowManagerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [slideshowImages, setSlideshowImages] = useState<SlideshowImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedName, setSelectedName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get unique countries from projects
  const countries = useMemo(() => {
    const uniqueCountries = Array.from(new Set(projects.map(p => p.country).filter(Boolean))) as string[];
    return uniqueCountries.sort();
  }, [projects]);

  // Filter projects based on search, country, and name
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search filter
      if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Country filter
      if (selectedCountry && project.country !== selectedCountry) {
        return false;
      }

      // Name filter
      if (selectedName && project.name !== selectedName) {
        return false;
      }

      return true;
    });
  }, [projects, searchQuery, selectedCountry, selectedName]);

  // Get available project names based on country filter
  const availableNames = useMemo(() => {
    const filtered = selectedCountry
      ? projects.filter(p => p.country === selectedCountry)
      : projects;
    return Array.from(new Set(filtered.map(p => p.name))).sort();
  }, [projects, selectedCountry]);

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCountry('');
    setSelectedName('');
  };

  // Auto-select project if only one result from search
  useEffect(() => {
    if (searchQuery && filteredProjects.length === 1 && !selectedProjectId) {
      const project = filteredProjects[0];
      setSelectedProjectId(project.id);
      setSelectedName(project.name);
    }
  }, [searchQuery, filteredProjects, selectedProjectId]);

  // Load slideshow images when project changes
  useEffect(() => {
    if (selectedProjectId) {
      loadSlideshowImages();
    } else {
      setSlideshowImages([]);
    }
  }, [selectedProjectId]);

  const loadSlideshowImages = async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const result = await getSlideshowImages(selectedProjectId, false);

      if (result.success && result.images) {
        setSlideshowImages(result.images as SlideshowImage[]);

        // Check if there are unpublished changes
        const hasUnpublished = result.images.some((img: SlideshowImage) => !img.isPublished);
        setHasUnpublishedChanges(hasUnpublished);
      }
    } catch (error) {
      console.error('Error loading slideshow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = async (imageUrl: string, filename: string, fileId: string) => {
    if (!selectedProjectId) return;

    setLoading(true);
    try {
      const result = await addImageToSlideshow(selectedProjectId, fileId);
      if (result.success) {
        setShowImagePicker(false);
        await loadSlideshowImages();
      } else {
        alert(result.error || 'Erreur lors de l\'ajout de l\'image');
      }
    } catch (error) {
      console.error('Error adding image:', error);
      alert('Erreur lors de l\'ajout de l\'image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (slideshowImageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette image du slideshow ?')) {
      return;
    }

    try {
      const result = await removeSlideshowImage(slideshowImageId);
      if (result.success) {
        setSlideshowImages(prev => prev.filter(img => img.id !== slideshowImageId));
        setHasUnpublishedChanges(true);
      } else {
        alert(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Erreur lors de la suppression de l\'image');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = slideshowImages.findIndex((item) => item.id === active.id);
      const newIndex = slideshowImages.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(slideshowImages, oldIndex, newIndex);

      // Optimistic update
      setSlideshowImages(newItems);

      // Save the new order - CALLED OUTSIDE state updater
      await saveOrder(newItems);
    }
  };

  const saveOrder = async (items: SlideshowImage[]) => {
    if (!selectedProjectId) return;

    setSaving(true);
    try {
      const orderedIds = items.map(item => item.id);
      const result = await reorderSlideshowImages(selectedProjectId, orderedIds);

      if (!result.success) {
        alert(result.error || 'Erreur lors de la sauvegarde de l\'ordre');
        // Reload to get the correct order
        await loadSlideshowImages();
      } else {
        setHasUnpublishedChanges(true);
      }
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Erreur lors de la sauvegarde de l\'ordre');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedProjectId) return;

    if (!confirm('Êtes-vous sûr de vouloir publier ce slideshow ? Il sera visible publiquement.')) {
      return;
    }

    setPublishing(true);
    try {
      const result = await publishSlideshow(selectedProjectId);
      if (result.success) {
        setToast({ message: 'Slideshow publié avec succès !', type: 'success' });
        setHasUnpublishedChanges(false);
        await loadSlideshowImages();
      } else {
        setToast({ message: result.error || 'Erreur lors de la publication', type: 'error' });
      }
    } catch (error) {
      console.error('Error publishing slideshow:', error);
      setToast({ message: 'Erreur lors de la publication du slideshow', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestion Diaporama</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Créez et gérez les slideshows de vos projets
          </p>
        </div>

        {selectedProjectId && (
          <div className="flex gap-3">
            {hasUnpublishedChanges && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  Modifications non publiées
                </span>
              </div>
            )}

            <Button
              onClick={handlePublish}
              disabled={publishing || slideshowImages.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-xs px-6"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publication...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Publier
                </>
              )}
            </Button>

            <Button
              onClick={() => setShowPreview(true)}
              disabled={slideshowImages.length === 0}
              variant="outline"
              className="border-gray-200 dark:border-gray-700 font-bold uppercase tracking-widest text-xs px-6"
            >
              <Eye className="w-4 h-4 mr-2" />
              Tester
            </Button>
          </div>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Filtres de recherche
          </label>
          {(searchQuery || selectedCountry || selectedName) && (
            <button
              onClick={resetFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline px-2 py-1"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Field */}
          <div className="relative">
            <label htmlFor="search" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Rechercher
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom du projet..."
                className="w-full p-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Country Filter */}
          <div>
            <label htmlFor="country" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Pays
            </label>
            <select
              id="country"
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedName(''); // Reset name when country changes
              }}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Tous les pays</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>

          {/* Project Name Filter */}
          <div>
            <label htmlFor="projectName" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Nom du projet
            </label>
            <select
              id="projectName"
              value={selectedName}
              onChange={(e) => {
                const projectName = e.target.value;
                setSelectedName(projectName);
                // Find and select the project by name from ALL projects, not just filtered
                const project = projects.find(p => p.name === projectName);
                if (project) {
                  setSelectedProjectId(project.id);
                } else {
                  setSelectedProjectId('');
                }
              }}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            >
              <option value="">Tous les projets</option>
              {availableNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtered Results Info */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {filteredProjects.length} projet{filteredProjects.length !== 1 ? 's' : ''} trouvé{filteredProjects.length !== 1 ? 's' : ''}
          </span>
          {selectedProjectId && (
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              ✓ Projet sélectionné: {projects.find(p => p.id === selectedProjectId)?.name}
            </span>
          )}
        </div>

        {/* Clickable Project List */}
        {(searchQuery || selectedCountry) && filteredProjects.length > 0 && filteredProjects.length <= 10 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Résultats</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setSelectedName(project.name);
                  }}
                  className={`text-left p-3 rounded-lg border transition-all ${selectedProjectId === project.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-900 dark:text-indigo-100'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-900 dark:text-white'
                    }`}
                >
                  <div className="font-medium text-sm">{project.name}</div>
                  {project.country && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{project.country}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {(searchQuery || selectedCountry) && filteredProjects.length === 0 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-bold">Aucun projet trouvé</span> avec les critères de recherche actuels.
            </p>
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-amber-700 dark:text-amber-300 underline hover:no-underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}
      </div>

      {/* Slideshow Content */}
      {selectedProjectId && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              Images du Slideshow
              {slideshowImages.length > 0 && (
                <span className="ml-3 text-sm font-normal text-gray-500">
                  ({slideshowImages.length} image{slideshowImages.length > 1 ? 's' : ''})
                </span>
              )}
            </h2>

            <Button
              onClick={() => setShowImagePicker(true)}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 active:scale-95 transition-all font-bold uppercase tracking-widest text-xs px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une image
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
              <p className="text-sm text-gray-500">Chargement du slideshow...</p>
            </div>
          ) : slideshowImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Eye className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">Aucune image dans ce slideshow</p>
              <p className="text-sm">Cliquez sur &quot;Ajouter une image&quot; pour commencer</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={slideshowImages.map(img => img.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {slideshowImages.map((slideshowImage, index) => (
                    <SortableImageCard
                      key={slideshowImage.id}
                      id={slideshowImage.id}
                      image={slideshowImage.image}
                      order={index + 1}
                      isPublished={slideshowImage.isPublished}
                      onRemove={() => handleRemoveImage(slideshowImage.id)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay
                dropAnimation={{
                  sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                      active: {
                        opacity: '0.4',
                      },
                    },
                  }),
                }}
              >
                {activeId ? (
                  <div className="shadow-2xl opacity-90 scale-[1.02]">
                    <SortableImageCard
                      id={activeId}
                      image={slideshowImages.find((img) => img.id === activeId)!.image}
                      order={slideshowImages.findIndex((img) => img.id === activeId) + 1}
                      isPublished={slideshowImages.find((img) => img.id === activeId)!.isPublished}
                      onRemove={() => { }}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}

          {saving && (
            <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Sauvegarde de l&apos;ordre...</span>
            </div>
          )}
        </div>
      )}

      {/* Image Picker Modal */}
      <DatabaseImagePicker
        isOpen={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onSelect={handleAddImage}
      />

      {/* Slideshow Preview Modal */}
      <SlideshowPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        images={slideshowImages}
        projectName={selectedProject?.name}
      />

      {/* Toast Notification */}
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
