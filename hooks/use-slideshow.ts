import { useState, useCallback, useMemo } from 'react';
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
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadSlideshowImages = useCallback(async () => {
    if (!selectedProjectId) {
      setSlideshowImages([]);
      return;
    }

    setLoading(true);
    try {
      const result = await getSlideshowImages(selectedProjectId, false);

      if (result.success && result.images) {
        setSlideshowImages(result.images as SlideshowImage[]);
        const hasUnpublished = result.images.some((img: SlideshowImage) => !img.isPublished);
        setHasUnpublishedChanges(hasUnpublished);
      }
    } catch (error) {
      console.error('Error loading slideshow:', error);
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
        router.refresh();
        await loadSlideshowImages();
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de l\'ajout', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('Error adding image:', error);
      setToast({ message: 'Erreur lors de l\'ajout de l\'image', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeImage = async (slideshowImageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette image du slideshow ?')) {
      return false;
    }

    try {
      const result = await removeSlideshowImage(slideshowImageId);
      if (result.success) {
        setSlideshowImages(prev => prev.filter(img => img.id !== slideshowImageId));
        setHasUnpublishedChanges(true);
        router.refresh();
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de la suppression', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('Error removing image:', error);
      setToast({ message: 'Erreur lors de la suppression', type: 'error' });
      return false;
    }
  };

  const reorderImages = async (oldIndex: number, newIndex: number) => {
    if (!selectedProjectId) return;

    const newItems = arrayMove(slideshowImages, oldIndex, newIndex);
    setSlideshowImages(newItems); // Optimistic update

    setSaving(true);
    try {
      const orderedIds = newItems.map(item => item.id);
      const result = await reorderSlideshowImages(selectedProjectId, orderedIds);

      if (!result.success) {
        setToast({ message: result.error || 'Erreur sauvegarde ordre', type: 'error' });
        await loadSlideshowImages(); // Revert on error
      } else {
        setHasUnpublishedChanges(true);
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving order:', error);
      setToast({ message: 'Erreur lors de la sauvegarde de l\'ordre', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
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
        router.refresh();
        await loadSlideshowImages();
      } else {
        setToast({ message: result.error || 'Erreur publication', type: 'error' });
      }
    } catch (error) {
      console.error('Error publishing:', error);
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
