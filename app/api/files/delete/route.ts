import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { images, videos, documents, files } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { deleteFile } from "@/lib/files/blob-edge";
import { extractKeyFromUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";

export async function DELETE(request: Request) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileIds, permanent } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    if (permanent) {
      logger.info(`[DELETE API] Starting permanent deletion for ${fileIds.length} files`);

      const filesToDelete = await db.select()
        .from(files)
        .where(inArray(files.id, fileIds));

      const deletedCount = filesToDelete.length;
      const urlsToDelete = filesToDelete.map(f => f.blobUrl);

      for (const file of filesToDelete) {
        try {
          const key = file.blobPath || extractKeyFromUrl(file.blobUrl);
          if (key) {
            logger.debug(`[DELETE API] Deleting blob: ${key}`);
            await deleteFile(key);
          }
        } catch (error) {
          logger.error(`[DELETE API] Error deleting blob for file ${file.id}:`, error);
        }

        if (file.thumbnailUrl) {
          try {
            const thumbKey = extractKeyFromUrl(file.thumbnailUrl);
            if (thumbKey) {
              logger.debug(`[DELETE API] Deleting thumbnail: ${thumbKey}`);
              await deleteFile(thumbKey);
            }
          } catch (error) {
            logger.error(`[DELETE API] Error deleting thumbnail for file ${file.id}:`, error);
          }
        }
      }

      logger.debug(`[DELETE API] Cleaning up related DB entries for ${urlsToDelete.length} URLs`);

      await Promise.all([
        db.delete(images).where(inArray(images.url, urlsToDelete)),
        db.delete(videos).where(inArray(videos.url, urlsToDelete)),
        db.delete(documents).where(inArray(documents.url, urlsToDelete)),
      ]);

      await db.delete(files)
        .where(inArray(files.id, fileIds));

      logger.info(`[DELETE API] Permanent deletion complete`);
      return NextResponse.json({
        success: true,
        permanent: true,
        count: deletedCount
      });

    } else {
      logger.info(`[DELETE API] Performing soft delete for ${fileIds.length} files`);
      await db.update(files)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: session?.user?.id || 'unknown'
        })
        .where(inArray(files.id, fileIds));

      return NextResponse.json({
        success: true,
        permanent: false,
        count: fileIds.length
      });
    }

  } catch (error) {
    logger.error("Delete files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
