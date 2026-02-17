// hooks/use-slideshow.ts
import { useState, useCallback, useEffect } from 'react';
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
  createdAt: string; // Serialized for Cloudflare
  updatedAt: string; // Serialized for Cloudflare
  image: {
    id: string;
    url: string;
    alt: string | null;
    createdAt: string; // Serialized for Cloudflare
  };
}

export function useSlideshow(projectId: string | null) {
  const router = useRouter();
  const [slideshowImages, setSlideshowImages] = useState<SlideshowImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadSlideshowImages = useCallback(async () => {
    if (!projectId) {
      setSlideshowImages([]);
      return;
    }

    // Don't set loading true if we are just switching projects quickly to avoid flashing
    // But since we are fetching data, we should probably show loading state.
    setLoading(true);
    try {
      // Pass false to get all images (draft + published)
      const result = await getSlideshowImages(projectId, false);
      if (result.success && result.images) {
        const images = result.images as SlideshowImage[];
        setSlideshowImages(images);
        const hasUnpublished = images.some((img: SlideshowImage) => !img.isPublished);
        setHasUnpublishedChanges(hasUnpublished);
      } else {
        // Only show error if it's a real error, not just "no images"
        if (result.error) {
          console.error('[useSlideshow] Error result:', result.error);
          setToast({ message: "Erreur lors du chargement du slideshow", type: 'error' });
        }
      }
    } catch (error) {
      console.error('[useSlideshow] Error loading slideshow:', error);
      setToast({ message: "Erreur technique lors du chargement", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load images when projectId changes
  useEffect(() => {
    loadSlideshowImages();
  }, [loadSlideshowImages]);

  const addImage = async (imageUrl: string, filename: string, fileId: string) => {
    if (!projectId) return false;

    setLoading(true);
    try {
      const result = await addImageToSlideshow(projectId, fileId);
      if (result.success) {
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
    setDeletingId(slideshowImageId);
    try {
      const result = await removeSlideshowImage(slideshowImageId);
      if (result.success) {
        setSlideshowImages(prev => {
          const updated = prev.filter(img => img.id !== slideshowImageId);
          const hasUnpublished = updated.some(img => !img.isPublished);
          setHasUnpublishedChanges(hasUnpublished);
          return updated;
        });
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
    if (!projectId) return;

    const newItems = arrayMove(slideshowImages, oldIndex, newIndex);
    setSlideshowImages(newItems);
    setHasUnpublishedChanges(true);

    setSaving(true);
    try {
      const orderedIds = newItems.map(item => item.id);
      const result = await reorderSlideshowImages(projectId, orderedIds);

      if (!result.success) {
        setToast({ message: result.error || 'Erreur sauvegarde ordre', type: 'error' });
        await loadSlideshowImages(); // Revert on error
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
    if (!projectId) return;

    setPublishing(true);
    try {
      const result = await publishSlideshow(projectId);
      if (result.success) {
        setToast({ message: 'Slideshow publié avec succès !', type: 'success' });
        setHasUnpublishedChanges(false);
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
