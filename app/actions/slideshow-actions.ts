"use server";

import { db } from "@/lib/db";
import { slideshowImages, images, files } from "@/lib/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function getSlideshowImages(projectId: string, publishedOnly: boolean = false) {
  try {
    if (!projectId) {
      logger.error("[getSlideshowImages] projectId is missing");
      return { success: false, error: "ID du projet manquant." };
    }

    const conditions = [eq(slideshowImages.projectId, projectId)];
    if (publishedOnly) {
      conditions.push(eq(slideshowImages.isPublished, true));
    }

    const slideshowImageRecords = await db.select({
      id: slideshowImages.id,
      projectId: slideshowImages.projectId,
      imageId: slideshowImages.imageId,
      order: slideshowImages.order,
      isPublished: slideshowImages.isPublished,
      createdAt: slideshowImages.createdAt,
      updatedAt: slideshowImages.updatedAt,
      image: images,
    })
      .from(slideshowImages)
      .innerJoin(images, eq(slideshowImages.imageId, images.id))
      .where(and(...conditions))
      .orderBy(asc(slideshowImages.order));


    const serializedImages = slideshowImageRecords.map(si => {
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
        logger.error(`[getSlideshowImages] Serialization error for image ${si.id}:`, e);
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
    logger.error("[getSlideshowImages] Exception caught:", error);
    return {
      success: false,
      error: error instanceof Error ? `Erreur: ${error.message}` : "Erreur lors de la récupération des images du slideshow."
    };
  }
}

export async function addSlideshowImage(projectId: string, imageId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    const existing = await db.select()
      .from(slideshowImages)
      .where(and(
        eq(slideshowImages.projectId, projectId),
        eq(slideshowImages.imageId, imageId)
      ))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "Cette image est déjà dans le slideshow." };
    }

    const maxOrderResult = await db.select({ order: slideshowImages.order })
      .from(slideshowImages)
      .where(eq(slideshowImages.projectId, projectId))
      .orderBy(desc(slideshowImages.order))
      .limit(1);

    const newOrder = (maxOrderResult[0]?.order ?? -1) + 1;

    const [slideshowImageRecord] = await db.insert(slideshowImages)
      .values({
        projectId,
        imageId,
        order: newOrder,
        isPublished: false,
      })
      .returning();

    const [imageRecord] = await db.select()
      .from(images)
      .where(eq(images.id, imageId))
      .limit(1);

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    const serializedSlideshowImage = {
      ...slideshowImageRecord,
      createdAt: slideshowImageRecord.createdAt.toISOString(),
      updatedAt: slideshowImageRecord.updatedAt.toISOString(),
      image: imageRecord ? {
        ...imageRecord,
        createdAt: imageRecord.createdAt.toISOString(),
      } : null,
    };

    return { success: true, slideshowImage: serializedSlideshowImage };
  } catch (error) {
    logger.error("Error adding slideshow image:", error);
    return { success: false, error: "Erreur lors de l'ajout de l'image au slideshow." };
  }
}

export async function addImageToSlideshow(projectId: string, fileId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    const [file] = await db.select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    if (!file || file.fileType !== 'IMAGE') {
      return { success: false, error: "Fichier image introuvable." };
    }

    let imageRecord = await db.select()
      .from(images)
      .where(and(
        eq(images.url, file.blobUrl),
        eq(images.projectId, projectId)
      ))
      .limit(1);

    if (imageRecord.length === 0) {
      const [newImage] = await db.insert(images)
        .values({
          url: file.blobUrl,
          alt: file.name,
          projectId,
          order: 0
        })
        .returning();
      imageRecord = [newImage];
    }

    return await addSlideshowImage(projectId, imageRecord[0].id);
  } catch (error) {
    logger.error("Error adding image to slideshow:", error);
    return { success: false, error: "Erreur lors de l'ajout de l'image au slideshow." };
  }
}

export async function removeSlideshowImage(slideshowImageId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    const [slideshowImageRecord] = await db.select({ projectId: slideshowImages.projectId })
      .from(slideshowImages)
      .where(eq(slideshowImages.id, slideshowImageId))
      .limit(1);

    if (!slideshowImageRecord) {
      return { success: false, error: "Image de slideshow introuvable." };
    }

    await db.delete(slideshowImages)
      .where(eq(slideshowImages.id, slideshowImageId));

    revalidatePath("/slideshow");
    revalidatePath(`/slideshow/view/${slideshowImageRecord.projectId}`);

    return { success: true };
  } catch (error) {
    logger.error("Error removing slideshow image:", error);
    return { success: false, error: "Erreur lors de la suppression de l'image du slideshow." };
  }
}

export async function reorderSlideshowImages(projectId: string, orderedImageIds: string[]) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    await db.transaction(async (tx) => {
      for (let index = 0; index < orderedImageIds.length; index++) {
        await tx.update(slideshowImages)
          .set({ order: index })
          .where(eq(slideshowImages.id, orderedImageIds[index]));
      }
    });

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error("Error reordering slideshow images:", error);
    return { success: false, error: "Erreur lors de la réorganisation des images." };
  }
}

export async function publishSlideshow(projectId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent publier les slideshows." };
  }

  try {
    await db.update(slideshowImages)
      .set({ isPublished: true })
      .where(eq(slideshowImages.projectId, projectId));

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error("Error publishing slideshow:", error);
    return { success: false, error: "Erreur lors de la publication du slideshow." };
  }
}

export async function unpublishSlideshow(projectId: string) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les slideshows." };
  }

  try {
    await db.update(slideshowImages)
      .set({ isPublished: false })
      .where(eq(slideshowImages.projectId, projectId));

    revalidatePath("/");
    revalidatePath(`/slideshow/view/${projectId}`);

    return { success: true };
  } catch (error) {
    logger.error("Error unpublishing slideshow:", error);
    return { success: false, error: "Erreur lors de la dépublication du slideshow." };
  }
}
