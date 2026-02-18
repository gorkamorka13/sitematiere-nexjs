"use server";

import { db } from "@/lib/db";
import { projects, slideshowImages, images, files } from "@/lib/db/schema";
import { eq, and, or, asc, ilike, isNull } from "drizzle-orm";
import { naturalSort } from "@/lib/sort-utils";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { logger } from "@/lib/logger";

export async function getProjectMedia(projectName: string) {
  const folderName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const session = await auth();
  const userRole = session?.user?.role || "VISITOR" as UserRole;

  const result = {
    images: [] as { url: string; name: string }[],
    pdfs: [] as { url: string; name: string }[],
  };

  if (!folderName) return result;

  try {
    const projectRecords = await db.select()
      .from(projects)
      .where(or(
        ilike(projects.name, `%${projectName}%`),
        eq(projects.id, folderName)
      ))
      .limit(1);

    const project = projectRecords[0];

    if (project) {
      const slideshowImageRecords = await db.select({
        id: slideshowImages.id,
        order: slideshowImages.order,
        image: images,
      })
        .from(slideshowImages)
        .innerJoin(images, eq(slideshowImages.imageId, images.id))
        .where(eq(slideshowImages.projectId, project.id))
        .orderBy(asc(slideshowImages.order));

      if (slideshowImageRecords.length > 0) {
        result.images = slideshowImageRecords.map(si => ({
          url: si.image.url,
          name: si.image.alt || si.image.url.split('/').pop() || 'Photo'
        }));
      }

      const fileRecords = await db.select()
        .from(files)
        .where(and(
          eq(files.projectId, project.id),
          eq(files.isDeleted, false)
        ))
        .orderBy(asc(files.name));

      if (fileRecords.length > 0) {
        fileRecords.forEach((file) => {
          if (slideshowImageRecords.length === 0 && file.fileType === 'IMAGE') {
            result.images.push({ url: file.blobUrl, name: file.name });
          }
          else if (file.fileType === 'DOCUMENT' && file.mimeType === 'application/pdf' && userRole !== "VISITOR") {
            result.pdfs.push({ url: file.blobUrl, name: file.name });
          }
        });

        if (slideshowImageRecords.length === 0) {
          result.images = naturalSort(result.images, 'name');
        }
        result.pdfs = naturalSort(result.pdfs, 'name');

        return result;
      }
    }

  } catch (error) {
    logger.error(`Error fetching media for ${projectName}:`, error);
  }

  return result;
}