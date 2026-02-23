"use server";

import { db } from "@/lib/db";
import { projects, slideshowImages, images, files, documents } from "@/lib/db/schema";
import { eq, and, or, asc, ilike } from "drizzle-orm";
import { naturalSort } from "@/lib/sort-utils";
import { auth } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { logger } from "@/lib/logger";

export async function getProjectMedia(projectName: string, projectId?: string) {
  const folderName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');


  const session = await auth();
  const userRole = session?.user?.role || "VISITOR" as UserRole;

  const result = {
    images: [] as { url: string; name: string }[],
    pdfs: [] as { url: string; name: string }[],
  };

  if (!folderName) return result;

  try {
    const conditions = [
      projectId ? eq(projects.id, projectId) : undefined,
      ilike(projects.name, `%${projectName}%`),
      eq(projects.id, folderName)
    ].filter((c): c is any => !!c);

    const projectRecords = await db.select()
      .from(projects)
      .where(or(...conditions))
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
          or(
            eq(files.projectId, project.id),
            ilike(files.name, `%${projectName}%`),
            ilike(files.blobPath, `%${folderName}%`)
          ),
          eq(files.isDeleted, false)
        ))
        .orderBy(asc(files.name));


      if (fileRecords.length > 0) {
        fileRecords.forEach((file) => {
          const isPdf = file.name.toLowerCase().endsWith('.pdf') ||
                        file.mimeType === 'application/pdf' ||
                        file.blobUrl.toLowerCase().endsWith('.pdf');

          if (slideshowImageRecords.length === 0 && file.fileType === 'IMAGE') {
            result.images.push({ url: file.blobUrl, name: file.name });
          }
          else if (isPdf && userRole !== "VISITOR") {
            if (!result.pdfs.find(p => p.url === file.blobUrl)) {
              result.pdfs.push({ url: file.blobUrl, name: file.name });
            }
          }
        });
      }

      // Fallback/Addition: Check documents table for any PDFs that aren't UI assets
      if (userRole !== "VISITOR") {
        const documentRecords = await db.select()
          .from(documents)
          .where(eq(documents.projectId, project.id));


        documentRecords.forEach(doc => {
          const isPdf = doc.name.toLowerCase().endsWith('.pdf') || doc.url.toLowerCase().endsWith('.pdf');
          const isUiAsset = ['FLAG', 'CLIENT_LOGO', 'PIN'].includes(doc.type);

          if (isPdf && !isUiAsset) {
            if (!result.pdfs.find(p => p.url === doc.url)) {
              result.pdfs.push({ url: doc.url, name: doc.name });
            }
          }
        });
      }

      if (slideshowImageRecords.length === 0) {
        result.images = naturalSort(result.images, 'name');
      }
      result.pdfs = naturalSort(result.pdfs, 'name');


      if (result.pdfs.length > 0) {
        return result;
      }
    }

    // ULTRA FALLBACK: If no project found OR no PDFs found, search globally by name
    if (result.pdfs.length === 0 && userRole !== "VISITOR") {
      const globalPdfFiles = await db.select()
        .from(files)
        .where(and(
          or(
            ilike(files.name, `%${projectName}%`),
            ilike(files.blobPath, `%${folderName}%`),
            ilike(files.blobUrl, `%${projectName}%`)
          ),
          eq(files.isDeleted, false)
        ))
        .limit(10);

      globalPdfFiles.forEach(file => {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') ||
                      file.mimeType === 'application/pdf' ||
                      file.blobUrl.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          if (!result.pdfs.find(p => p.url === file.blobUrl)) {
            result.pdfs.push({ url: file.blobUrl, name: file.name });
          }
        }
      });

      const globalPdfDocs = await db.select()
        .from(documents)
        .where(or(
          ilike(documents.name, `%${projectName}%`),
          ilike(documents.url, `%${projectName}%`)
        ))
        .limit(10);

      globalPdfDocs.forEach(doc => {
        const isPdf = doc.name.toLowerCase().endsWith('.pdf') || doc.url.toLowerCase().endsWith('.pdf');
        const isUiAsset = ['FLAG', 'CLIENT_LOGO', 'PIN'].includes(doc.type);
        if (isPdf && !isUiAsset) {
          if (!result.pdfs.find(p => p.url === doc.url)) {
            result.pdfs.push({ url: doc.url, name: doc.name });
          }
        }
      });

      result.pdfs = naturalSort(result.pdfs, 'name');
    }

  } catch (error) {
    console.error(`[getProjectMedia] Error fetching media for ${projectName}:`, error);
  }

  return result;
}
