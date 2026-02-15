"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Get all videos for a project
 */
export async function getProjectVideos(projectId: string) {
  try {
    const videos = await prisma.video.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, videos };
  } catch (error) {
    console.error("Error fetching videos:", error);
    return { success: false, error: "Erreur lors de la récupération des vidéos." };
  }
}

/**
 * Add a new video to a project
 */
export async function addProjectVideo(projectId: string, url: string, title?: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les vidéos." };
  }

  if (!url) {
    return { success: false, error: "L'URL de la vidéo est requise." };
  }

  try {
    const video = await prisma.video.create({
      data: {
        projectId,
        url,
        title: title || "Vidéo sans titre",
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { success: true, video };
  } catch (error) {
    console.error("Error adding video:", error);
    return { success: false, error: "Erreur lors de l'ajout de la vidéo." };
  }
}

/**
 * Delete a video
 */
export async function deleteProjectVideo(videoId: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
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
    console.error("Error deleting video:", error);
    return { success: false, error: "Erreur lors de la suppression de la vidéo." };
  }
}
import { getSignedUploadUrl, getFileUrl } from "@/lib/storage/r2-operations";

/**
 * Get a signed URL for uploading a video to R2
 */
export async function getSignedVideoUploadAction(projectId: string, fileName: string, contentType: string) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
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
    console.error("Error generating signed URL:", error);
    return { success: false, error: "Erreur lors de la préparation de l'envoi." };
  }
}
