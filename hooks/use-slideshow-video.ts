import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProjectVideos,
  addProjectVideo,
  deleteProjectVideo,
  reorderProjectVideos,
  publishProjectVideos,
  unpublishProjectVideos,
  toggleVideoPublishStatus
} from '@/app/actions/video-actions';
import { arrayMove } from '@dnd-kit/sortable';
import { ToastType } from '@/components/ui/toast';

export interface SlideshowVideo {
  id: string;
  url: string;
  title: string | null;
  projectId: string;
  order: number;
  isPublished: boolean;
  createdAt: string; // Serialized
  updatedAt: string; // Serialized
}

interface UseSlideshowVideoProps {
  initialProjectId?: string;
}

export function useSlideshowVideo({ initialProjectId = '' }: UseSlideshowVideoProps = {}) {
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [videos, setVideos] = useState<SlideshowVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const loadVideos = useCallback(async () => {
    if (!selectedProjectId) {
      setVideos([]);
      return;
    }

    console.log('[useSlideshowVideo] Loading videos for project:', selectedProjectId);
    setLoading(true);
    try {
      const result = await getProjectVideos(selectedProjectId);
      if (result.success && result.videos) {
        // Cast result to SlideshowVideo (ensuring types match)
        const loadedVideos = result.videos as unknown as SlideshowVideo[];
        setVideos(loadedVideos);

        // Check if there are any unpublished videos (drafts)
        const hasUnpublished = loadedVideos.some(v => !v.isPublished);
        setHasUnpublishedChanges(hasUnpublished);
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error loading videos:', error);
      setToast({ message: "Erreur lors du chargement des vidéos", type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  const addVideo = async (url: string, title?: string) => {
    if (!selectedProjectId) return false;

    setLoading(true);
    try {
      const result = await addProjectVideo(selectedProjectId, url, title);
      if (result.success && result.video) {
        setHasUnpublishedChanges(true);
        await loadVideos(); // Reload to get correct order and state
        router.refresh();
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de l\'ajout', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error adding video:', error);
      setToast({ message: 'Erreur lors de l\'ajout de la vidéo', type: 'error' });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const removeVideo = async (videoId: string) => {
    setDeletingId(videoId);
    try {
      const result = await deleteProjectVideo(videoId);
      if (result.success) {
        setVideos(prev => {
          const updated = prev.filter(v => v.id !== videoId);
          const hasUnpublished = updated.some(v => !v.isPublished);
          setHasUnpublishedChanges(hasUnpublished);
          return updated;
        });
        return true;
      } else {
        setToast({ message: result.error || 'Erreur lors de la suppression', type: 'error' });
        return false;
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error removing video:', error);
      setToast({ message: 'Erreur lors de la suppression', type: 'error' });
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const reorderVideos = async (oldIndex: number, newIndex: number) => {
    if (!selectedProjectId) return;

    const newItems = arrayMove(videos, oldIndex, newIndex);
    setVideos(newItems);
    // Note: Reordering doesn't strictly mean "unpublished changes" if we auto-save,
    // but visually we might want to indicate it. Current logic:
    // We auto-save reordering immediately.

    setSaving(true);
    try {
      const orderedIds = newItems.map(item => item.id);
      const result = await reorderProjectVideos(selectedProjectId, orderedIds);

      if (!result.success) {
        setToast({ message: result.error || 'Erreur sauvegarde ordre', type: 'error' });
        await loadVideos(); // Revert on error
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error saving order:', error);
      setToast({ message: 'Erreur lors de la sauvegarde de l\'ordre', type: 'error' });
      await loadVideos();
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selectedProjectId) return;

    setPublishing(true);
    try {
      const result = await publishProjectVideos(selectedProjectId);
      if (result.success) {
        setToast({ message: 'Vidéos publiées avec succès !', type: 'success' });
        setHasUnpublishedChanges(false);
        setVideos(prev => prev.map(v => ({ ...v, isPublished: true })));
        router.refresh();
      } else {
        setToast({ message: result.error || 'Erreur publication', type: 'error' });
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error publishing:', error);
      setToast({ message: 'Erreur lors de la publication', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!selectedProjectId) return;

    setPublishing(true);
    try {
      const result = await unpublishProjectVideos(selectedProjectId);
      if (result.success) {
        setToast({ message: 'Vidéos dépubliées (brouillon).', type: 'success' });
        setHasUnpublishedChanges(true); // All are now drafts
        setVideos(prev => prev.map(v => ({ ...v, isPublished: false })));
        router.refresh();
      } else {
        setToast({ message: result.error || 'Erreur dépublication', type: 'error' });
      }
    } catch (error) {
      console.error('[useSlideshowVideo] Error unpublishing:', error);
      setToast({ message: 'Erreur lors de la dépublication', type: 'error' });
    } finally {
      setPublishing(false);
    }
  };

  const togglePublish = async (videoId: string) => {
    // Optimistic update
    setVideos(prev => prev.map(v =>
      v.id === videoId ? { ...v, isPublished: !v.isPublished } : v
    ));

    try {
      const result = await toggleVideoPublishStatus(videoId);
      if (!result.success) {
        // Revert on error
        setVideos(prev => prev.map(v =>
          v.id === videoId ? { ...v, isPublished: !v.isPublished } : v
        ));
        setToast({ message: result.error || 'Erreur modification statut', type: 'error' });
      } else {
        // Update with server confirmed data
        setVideos(prev => prev.map(v =>
          v.id === videoId && result.video ? { ...v, isPublished: result.video.isPublished as boolean } : v
        ));

        // Recalculate global unpublished state
        setHasUnpublishedChanges(videos.some(v => !v.isPublished));
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
      // Revert
      setVideos(prev => prev.map(v =>
        v.id === videoId ? { ...v, isPublished: !v.isPublished } : v
      ));
    }
  };

  return {
    selectedProjectId,
    setSelectedProjectId,
    videos,
    loading,
    saving,
    publishing,
    deletingId,
    hasUnpublishedChanges,
    toast,
    setToast,
    loadVideos,
    addVideo,
    removeVideo,
    reorderVideos,
    publish,
    unpublish,
    togglePublish
  };
}
