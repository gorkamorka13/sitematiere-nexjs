"use server";

import prisma from "@/lib/prisma";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getSignedUploadUrl, getFileUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";

/**
 * Get all videos for a project, ordered by 'order' field
 */
export async function getProjectVideos(projectId: string) {
  logger.debug(`[getProjectVideos] Fetching videos for projectId: ${projectId}`);
  try {
    if (!projectId) {
      logger.error("[getProjectVideos] projectId is missing");
      return { success: false, error: "ID du projet manquant." };
    }

    logger.debug(`[getProjectVideos] Querying Prisma for projectId: ${projectId}`);
    const videos = await prisma.video.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    logger.debug(`[getProjectVideos] Successfully found ${videos.length} videos`);

    // Serialize dates to ISO strings for Cloudflare compatibility
    const serializedVideos = videos.map(v => {
      try {
        return {
          id: v.id,
          url: v.url ? v.url.trim().replace(/\n/g, '') : '',
          title: v.title,
          projectId: v.projectId,
          order: v.order,
          isPublished: v.isPublished,
          createdAt: v.createdAt ? v.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: v.updatedAt ? v.updatedAt.toISOString() : new Date().toISOString(),
        };
      } catch (e) {
        logger.error(`[getProjectVideos] Serialization error for video ${v.id}:`, e);
        return {
          id: v.id,
          url: v.url ? v.url.trim().replace(/\n/g, '') : '',
          title: v.title,
          projectId: v.projectId,
          order: v.order,
          isPublished: v.isPublished,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    });

    return { success: true, videos: serializedVideos };
  } catch (error: unknown) {
    logger.error("[getProjectVideos] CRITICAL ERROR:", error);
    const err = error as { name?: string; message?: string; code?: string; meta?: unknown };
    const errorDetails = {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      runtime: process.env.NEXT_RUNTIME,
      isCloudflare: !!process.env.CF_PAGES
    };
    logger.error("[getProjectVideos] Error Details:", errorDetails);

    return {
      success: false,
      error: `Détail technique: ${err?.name || 'Error'} - ${err?.message || 'Inconnu'}. Code: ${err?.code || 'N/A'}`
    };
  }
}

/**
 * Add a new video to a project
 */
export async function addProjectVideo(projectId: string, url: string, title?: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les vidéos." };
  }

  if (!url) {
    return { success: false, error: "L'URL de la vidéo est requise." };
  }

  try {
    // Get max order to append at the end
    const maxOrderVideo = await prisma.video.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true }
    });

    const newOrder = (maxOrderVideo?.order ?? -1) + 1;

    const video = await prisma.video.create({
      data: {
        projectId,
        url,
        title: title || "Vidéo sans titre",
        order: newOrder,
        isPublished: false, // Default to unpublished (draft)
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    // Serialize dates to ISO strings for Cloudflare compatibility
    const serializedVideo = {
      ...video,
      createdAt: video.createdAt.toISOString(),
      updatedAt: video.updatedAt.toISOString(),
    };

    return { success: true, video: serializedVideo };
  } catch (error) {
    logger.error("Error adding video:", error);
    return { success: false, error: "Erreur lors de l'ajout de la vidéo." };
  }
}

/**
 * Delete a video
 */
export async function deleteProjectVideo(videoId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les vidéos." };
  }

  try {
    await prisma.video.delete({
      where: { id: videoId },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error deleting video:", error);
    return { success: false, error: "Erreur lors de la suppression de la vidéo." };
  }
}

/**
 * Reorder videos
 * @param projectId - Project ID
 * @param orderedVideoIds - Array of video IDs in the new order
 */
export async function reorderProjectVideos(projectId: string, orderedVideoIds: string[]) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    // Update order in transaction
    await prisma.$transaction(
      orderedVideoIds.map((id, index) =>
        prisma.video.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error reordering videos:", error);
    return { success: false, error: "Erreur lors de la réorganisation des vidéos." };
  }
}

/**
 * Publish all videos for a project
 */
export async function publishProjectVideos(projectId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    await prisma.video.updateMany({
      where: { projectId },
      data: { isPublished: true },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error publishing videos:", error);
    return { success: false, error: "Erreur lors de la publication des vidéos." };
  }
}

/**
 * Unpublish all videos for a project (revert to draft)
 */
export async function unpublishProjectVideos(projectId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    await prisma.video.updateMany({
      where: { projectId },
      data: { isPublished: false },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error unpublishing videos:", error);
    return { success: false, error: "Erreur lors de la dépublication des vidéos." };
  }
}

/**
 * Toggle publish status for a single video
 */
export async function toggleVideoPublishStatus(videoId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { isPublished: true, projectId: true }
    });

    if (!video) throw new Error("Vidéo introuvable");

    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: { isPublished: !video.isPublished }
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    // Serialize date
    const serializedVideo = {
      ...updatedVideo,
      createdAt: updatedVideo.createdAt.toISOString(),
      updatedAt: updatedVideo.updatedAt.toISOString(),
    };

    return { success: true, video: serializedVideo };
  } catch (error) {
    logger.error("Error toggling video publish status:", error);
    return { success: false, error: "Erreur lors de la modification du statut." };
  }
}

/**
 * Get a signed URL for uploading a video to R2
 */
export async function getSignedVideoUploadAction(projectId: string, fileName: string, contentType: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });

    if (!project) {
      return { success: false, error: "Projet non trouvé." };
    }

    const projectSlug = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now();
    const r2Key = `videos/${projectSlug}/${timestamp}-${fileName}`;

    const signedUrl = await getSignedUploadUrl(r2Key, contentType);
    const publicUrl = getFileUrl(r2Key);

    return {
      success: true,
      signedUrl,
      publicUrl,
      r2Key
    };
  } catch (error) {
    logger.error("Error generating signed URL:", error);
    return { success: false, error: "Erreur lors de la préparation de l'envoi." };
  }
}
