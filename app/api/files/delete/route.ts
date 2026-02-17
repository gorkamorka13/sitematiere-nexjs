import { NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteFile } from "@/lib/files/blob-edge";
import { extractKeyFromUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";

// Cloudflare Pages requires Edge Runtime for API routes
// export const runtime = 'edge'; // Commenté pour le dev local


export async function DELETE(request: Request) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
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

      // 1. Get files details before deleting them
      const filesToDelete = await prisma.file.findMany({
        where: { id: { in: fileIds } }
      });

      const deletedCount = filesToDelete.length;
      const urlsToDelete = filesToDelete.map(f => f.blobUrl);

      for (const file of filesToDelete) {
        // 2. Delete main file from Cloudflare R2
        try {
          const key = file.blobPath || extractKeyFromUrl(file.blobUrl);
          if (key) {
            logger.debug(`[DELETE API] Deleting blob: ${key}`);
            await deleteFile(key);
          }
        } catch (error) {
          logger.error(`[DELETE API] Error deleting blob for file ${file.id}:`, error);
        }

        // 3. Delete thumbnail if exists
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

      // 4. Delete related entries in other tables (Image, Video, Document)
      // Since these maps to same URLs, we clean them up as well
      logger.debug(`[DELETE API] Cleaning up related DB entries for ${urlsToDelete.length} URLs`);

      await Promise.all([
        prisma.image.deleteMany({ where: { url: { in: urlsToDelete } } }),
        prisma.video.deleteMany({ where: { url: { in: urlsToDelete } } }),
        prisma.document.deleteMany({ where: { url: { in: urlsToDelete } } }),
      ]);

      // 5. Finally delete from File table
      await prisma.file.deleteMany({
        where: { id: { in: fileIds } }
      });

      logger.info(`[DELETE API] Permanent deletion complete`);
      return NextResponse.json({
        success: true,
        permanent: true,
        count: deletedCount
      });

    } else {
      // Soft delete
      logger.info(`[DELETE API] Performing soft delete for ${fileIds.length} files`);
      await prisma.file.updateMany({
        where: {
          id: { in: fileIds }
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: session.user.id
        }
      });

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
