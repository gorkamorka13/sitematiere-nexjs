"use server";

import { db } from "@/lib/db";
import { videos, projects } from "@/lib/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { revalidatePath } from "next/cache";
import { getSignedUploadUrl, getFileUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";

export async function getProjectVideos(projectId: string) {
  logger.debug(`[getProjectVideos] Fetching videos for projectId: ${projectId}`);
  try {
    if (!projectId) {
      logger.error("[getProjectVideos] projectId is missing");
      return { success: false, error: "ID du projet manquant." };
    }

    logger.debug(`[getProjectVideos] Querying Drizzle for projectId: ${projectId}`);
    const videoRecords = await db.select()
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(asc(videos.order));

    logger.debug(`[getProjectVideos] Successfully found ${videoRecords.length} videos`);

    const serializedVideos = videoRecords.map(v => {
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

export async function addProjectVideo(projectId: string, url: string, title?: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les vidéos." };
  }

  if (!url) {
    return { success: false, error: "L'URL de la vidéo est requise." };
  }

  try {
    const maxOrderVideo = await db.select({ order: videos.order })
      .from(videos)
      .where(eq(videos.projectId, projectId))
      .orderBy(desc(videos.order))
      .limit(1);

    const newOrder = (maxOrderVideo[0]?.order ?? -1) + 1;

    const [video] = await db.insert(videos)
      .values({
        projectId,
        url,
        title: title || "Vidéo sans titre",
        order: newOrder,
        isPublished: false,
      })
      .returning();

    revalidatePath("/");
    revalidatePath("/dashboard");

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

export async function deleteProjectVideo(videoId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les vidéos." };
  }

  try {
    await db.delete(videos)
      .where(eq(videos.id, videoId));

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error deleting video:", error);
    return { success: false, error: "Erreur lors de la suppression de la vidéo." };
  }
}

export async function reorderProjectVideos(projectId: string, orderedVideoIds: string[]) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    await db.transaction(async (tx) => {
      for (let index = 0; index < orderedVideoIds.length; index++) {
        await tx.update(videos)
          .set({ order: index })
          .where(eq(videos.id, orderedVideoIds[index]));
      }
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error reordering videos:", error);
    return { success: false, error: "Erreur lors de la réorganisation des vidéos." };
  }
}

export async function publishProjectVideos(projectId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    await db.update(videos)
      .set({ isPublished: true })
      .where(eq(videos.projectId, projectId));

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error publishing videos:", error);
    return { success: false, error: "Erreur lors de la publication des vidéos." };
  }
}

export async function unpublishProjectVideos(projectId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    await db.update(videos)
      .set({ isPublished: false })
      .where(eq(videos.projectId, projectId));

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error("Error unpublishing videos:", error);
    return { success: false, error: "Erreur lors de la dépublication des vidéos." };
  }
}

export async function toggleVideoPublishStatus(videoId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    const [video] = await db.select({ isPublished: videos.isPublished, projectId: videos.projectId })
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!video) throw new Error("Vidéo introuvable");

    const [updatedVideo] = await db.update(videos)
      .set({ isPublished: !video.isPublished, updatedAt: new Date() })
      .where(eq(videos.id, videoId))
      .returning();

    revalidatePath("/");
    revalidatePath("/dashboard");

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

export async function getSignedVideoUploadAction(projectId: string, fileName: string, contentType: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée." };
  }

  try {
    const [project] = await db.select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

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