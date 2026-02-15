import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSlideshowImages,
  addImageToSlideshow,
  removeSlideshowImage,
  reorderSlideshowImages,
  publishSlideshow
} from '@/app/actions/slideshow-actions';
import { arrayMove } from '@dnd-kit/sortable';
import { ToastType } from '@/components/ui/toast';

export interface SlideshowImage {
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

interface UseSlideshowProps {
  initialProjectId?: string;
}

export function useSlideshow({ initialProjectId = '' }: UseSlideshowProps = {}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [slideshowImages, setSlideshowImages] = useState<SlideshowImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadSlideshowImages = useCallback(async () => {
    if (!selectedProjectId) {
      setSlideshowImages([]);
      return;
    }

    console.log('[useSlideshow] Loading images for project:', selectedProjectId);
    setLoading(true);
    try {
      const result = await getSlideshowImages(selectedProjectId, false);
      if (result.success && result.images) {
        const images = result.images as SlideshowImage[];
        setSlideshowImages(images);
        const hasUnpublished = images.some((img: SlideshowImage) => !img.isPublished);
        setHasUnpublishedChanges(hasUnpublished);
      }
    } catch (error) {
      console.error('[useSlideshow] Error loading slideshow:', error);
      setToast({ message: "Erreur lors du chargement du slideshow", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const addImage = async (imageUrl: string, filename: string, fileId: string) => {
    if (!selectedProjectId) return false;

    setLoading(true);
    try {
      const result = await addImageToSlideshow(selectedProjectId, fileId);
      if (result.success) {
        // After adding, we definitely have unpublished changes
        setHasUnpublishedChanges(true);
        await loadSlideshowImages();
        router.refresh();
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de l\'ajout', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('[useSlideshow] Error adding image:', error);
      setToast({ message: 'Erreur lors de l\'ajout de l\'image', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async (slideshowImageId: string) => {
    console.log('[useSlideshow] removeImage hook execution start for:', slideshowImageId);
    setDeletingId(slideshowImageId);

    try {
      console.log('[useSlideshow] Calling server action removeSlideshowImage...');
      const result = await removeSlideshowImage(slideshowImageId);
      console.log('[useSlideshow] Server action result:', result);

      if (result.success) {
        setSlideshowImages(prev => {
          const updated = prev.filter(img => img.id !== slideshowImageId);
          // Only show banner if there are OTHER images that are unpublished
          const hasUnpublished = updated.some(img => !img.isPublished);
          setHasUnpublishedChanges(hasUnpublished);
          return updated;
        });
        // We don't necessarily need router.refresh() if we update state locally
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de la suppression', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('[useSlideshow] Error removing image:', error);
      setToast({ message: 'Erreur lors de la suppression', type: 'error' });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const reorderImages = async (oldIndex: number, newIndex: number) => {
    if (!selectedProjectId) return;

    const newItems = arrayMove(slideshowImages, oldIndex, newIndex);
    setSlideshowImages(newItems);
    setHasUnpublishedChanges(true); // Reordering is always an unpublished change

    setSaving(true);
    try {
      const orderedIds = newItems.map(item => item.id);
      const result = await reorderSlideshowImages(selectedProjectId, orderedIds);

      if (!result.success) {
        setToast({ message: result.error || 'Erreur sauvegarde ordre', type: 'error' });
        await loadSlideshowImages();
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('[useSlideshow] Error saving order:', error);
      setToast({ message: 'Erreur lors de la sauvegarde de l\'ordre', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selectedProjectId) return;

    setPublishing(true);
    try {
      console.log('[useSlideshow] Calling publish server action...');
      const result = await publishSlideshow(selectedProjectId);
      console.log('[useSlideshow] Publish result:', result);

      if (result.success) {
        setToast({ message: 'Slideshow publié avec succès !', type: 'success' });
        setHasUnpublishedChanges(false);
        // Refresh local state to show all images as "Published"
        setSlideshowImages(prev => prev.map(img => ({ ...img, isPublished: true })));
        router.refresh();
      } else {
        setToast({ message: result.error || 'Erreur publication', type: 'error' });
      }
    } catch (error) {
      console.error('[useSlideshow] Error publishing:', error);
      setToast({ message: 'Erreur lors de la publication', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  return {
    selectedProjectId,
    setSelectedProjectId,
    slideshowImages,
    loading,
    saving,
    publishing,
    deletingId,
    hasUnpublishedChanges,
    toast,
    setToast,
    loadSlideshowImages,
    addImage,
    removeImage,
    reorderImages,
    publish
  };
}
