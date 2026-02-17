"use server";

import prisma from "@/lib/prisma";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

/**
 * Get slideshow images for a project
 * @param projectId - Project ID
 * @param publishedOnly - If true, only return published images
 */
export async function getSlideshowImages(projectId: string, publishedOnly: boolean = false) {
  console.log(`[getSlideshowImages] Fetching for projectId: ${projectId}, publishedOnly: ${publishedOnly}`);
  try {
    if (!projectId) {
      console.error("[getSlideshowImages] projectId is missing");
      return { success: false, error: "ID du projet manquant." };
    }

    const where: Prisma.SlideshowImageWhereInput = { projectId };
    if (publishedOnly) {
      where.isPublished = true;
    }

    const slideshowImages = await prisma.slideshowImage.findMany({
      where,
      include: {
        image: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    console.log(`[getSlideshowImages] Found ${slideshowImages.length} images`);

    // Serialize dates for Cloudflare compatibility
    const serializedImages = slideshowImages.map(si => {
      try {
        return {
          id: si.id,
          projectId: si.projectId,
          imageId: si.imageId,
          order: si.order,
          isPublished: si.isPublished,
          createdAt: si.createdAt ? si.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: si.updatedAt ? si.updatedAt.toISOString() : new Date().toISOString(),
          image: si.image ? {
            id: si.image.id,
            url: si.image.url ? si.image.url.trim().replace(/\n/g, '') : '',
            alt: si.image.alt,
            projectId: si.image.projectId,
            createdAt: si.image.createdAt ? si.image.createdAt.toISOString() : new Date().toISOString(),
          } : null,
        };
      } catch (e) {
        console.error(`[getSlideshowImages] Serialization error for image ${si.id}:`, e);
        return {
          id: si.id,
          projectId: si.projectId,
          imageId: si.imageId,
          order: si.order,
          isPublished: si.isPublished,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          image: si.image ? {
            id: si.image.id,
            url: si.image.url ? si.image.url.trim().replace(/\n/g, '') : '',
            alt: si.image.alt,
            projectId: si.image.projectId,
            createdAt: new Date().toISOString(),
          } : null,
        };
      }
    }).filter(img => img.image !== null);

    return { success: true, images: serializedImages };
  } catch (error) {
    console.error("[getSlideshowImages] Exception caught:", error);
    return {
      success: false,
      error: error instanceof Error ? `Erreur: ${error.message}` : "Erreur lors de la récupération des images du slideshow."
    };
  }
}

/**
 * Add an image to the slideshow (as draft)
 */
export async function addSlideshowImage(projectId: string, imageId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    // Check if image already exists in slideshow
    const existing = await prisma.slideshowImage.findUnique({
      where: {
        projectId_imageId: {
          projectId,
          imageId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Cette image est déjà dans le slideshow." };
    }

    // Get the highest order number
    const maxOrder = await prisma.slideshowImage.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = (maxOrder?.order ?? -1) + 1;

    const slideshowImage = await prisma.slideshowImage.create({
      data: {
        projectId,
        imageId,
        order: newOrder,
        isPublished: false,
      },
      include: {
        image: true,
      },
    });

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    // Serialize dates for Cloudflare compatibility
    const serializedSlideshowImage = {
      ...slideshowImage,
      createdAt: slideshowImage.createdAt.toISOString(),
      updatedAt: slideshowImage.updatedAt.toISOString(),
      image: {
        ...slideshowImage.image,
        createdAt: slideshowImage.image.createdAt.toISOString(),
      },
    };

    return { success: true, slideshowImage: serializedSlideshowImage };
  } catch (error) {
    console.error("Error adding slideshow image:", error);
    return { success: false, error: "Erreur lors de l'ajout de l'image au slideshow." };
  }
}

/**
 * Add an image from the File table to the slideshow
 */
export async function addImageToSlideshow(projectId: string, fileId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    // 1. Get file details
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file || file.fileType !== 'IMAGE') {
      return { success: false, error: "Fichier image introuvable." };
    }

    // 2. Ensure Image record exists
    let image = await prisma.image.findFirst({
      where: { url: file.blobUrl, projectId }
    });

    if (!image) {
      image = await prisma.image.create({
        data: {
          url: file.blobUrl,
          alt: file.name,
          projectId,
          order: 0
        }
      });
    }

    // 3. Add to slideshow via existing logic
    return await addSlideshowImage(projectId, image.id);
  } catch (error) {
    console.error("Error adding image to slideshow:", error);
    return { success: false, error: "Erreur lors de l'ajout de l'image au slideshow." };
  }
}

/**
 * Remove an image from the slideshow
 */
export async function removeSlideshowImage(slideshowImageId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    const slideshowImage = await prisma.slideshowImage.findUnique({
      where: { id: slideshowImageId },
      select: { projectId: true },
    });

    if (!slideshowImage) {
      return { success: false, error: "Image de slideshow introuvable." };
    }

    await prisma.slideshowImage.delete({
      where: { id: slideshowImageId },
    });

    revalidatePath("/slideshow");
    revalidatePath(`/slideshow/view/${slideshowImage.projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error removing slideshow image:", error);
    return { success: false, error: "Erreur lors de la suppression de l'image du slideshow." };
  }
}

/**
 * Reorder slideshow images
 * @param projectId - Project ID
 * @param orderedImageIds - Array of slideshow image IDs in the new order
 */
export async function reorderSlideshowImages(projectId: string, orderedImageIds: string[]) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    // Update order for each image in a transaction
    await prisma.$transaction(
      orderedImageIds.map((id, index) =>
        prisma.slideshowImage.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error reordering slideshow images:", error);
    return { success: false, error: "Erreur lors de la réorganisation des images." };
  }
}

/**
 * Publish all current slideshow images for a project
 */
export async function publishSlideshow(projectId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent publier les slideshows." };
  }

  try {
    // Mark all slideshow images for this project as published
    await prisma.slideshowImage.updateMany({
      where: { projectId },
      data: { isPublished: true },
    });

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error publishing slideshow:", error);
    return { success: false, error: "Erreur lors de la publication du slideshow." };
  }
}

/**
 * Unpublish all slideshow images for a project (revert to draft)
 */
export async function unpublishSlideshow(projectId: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    await prisma.slideshowImage.updateMany({
      where: { projectId },
      data: { isPublished: false },
    });

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    console.error("Error unpublishing slideshow:", error);
    return { success: false, error: "Erreur lors de la dépublication du slideshow." };
  }
}
