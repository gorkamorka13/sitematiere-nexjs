import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files } from "@/lib/db/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { uploadFile, getFileTypeFromMime } from "@/lib/files/blob-edge";
import { validateFileSize, validateFileType, sanitizeFileName } from "@/lib/files/validation";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Access denied - Not authenticated" }, { status: 403 });
  }

  const userRole = session.user.role;
  if (userRole !== "ADMIN" && userRole !== "USER") {
    return NextResponse.json({ error: "Access denied - Insufficient permissions" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const filesInput = formData.getAll("file") as File[];
    const projectId = formData.get("projectId") as string;

    let targetProjectId: string | null = projectId;
    let folderName = projectId;

    if (!projectId || projectId === "global_unassigned") {
      targetProjectId = null;
      folderName = "global";
    } else {
      const project = await db.select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (project.length === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      folderName = project[0].id;
    }

    const uploadedFiles = [];
    const errors = [];
    const overwrite = formData.get("overwrite") === "true";

    for (const file of filesInput) {
      try {
        const sizeValidation = validateFileSize(file.size);
        if (!sizeValidation.valid) throw new Error(sizeValidation.error);

        const typeValidation = validateFileType(file.type, file.name);
        if (!typeValidation.valid) throw new Error(typeValidation.error);

        const sanitizedName = sanitizeFileName(file.name);
        const fileType = getFileTypeFromMime(file.type);

        const existingFile = targetProjectId
          ? await db.select()
              .from(files)
              .where(and(
                eq(files.name, sanitizedName),
                eq(files.projectId, targetProjectId),
                eq(files.isDeleted, false)
              ))
              .limit(1)
          : await db.select()
              .from(files)
              .where(and(
                eq(files.name, sanitizedName),
                isNull(files.projectId),
                eq(files.isDeleted, false)
              ))
              .limit(1);

        if (existingFile.length > 0 && !overwrite) {
          return NextResponse.json({
            success: false,
            conflict: true,
            fileName: sanitizedName
          }, { status: 409 });
        }

        if (existingFile.length > 0 && overwrite) {
          try {
            await db.delete(files)
              .where(eq(files.id, existingFile[0].id));
          } catch (e) {
            logger.error("Failed to delete existing file record", e);
          }
        }

        const { url, pathname } = await uploadFile(file, folderName);

        const thumbnailUrl = null;
        const width = null;
        const height = null;
        const duration = null;

        const [dbFile] = await db.insert(files)
          .values({
            name: sanitizedName,
            blobUrl: url,
            blobPath: pathname,
            fileType: fileType,
            mimeType: file.type,
            size: file.size,
            projectId: targetProjectId,
            thumbnailUrl: thumbnailUrl,
            width,
            height,
            duration
          })
          .returning();

        uploadedFiles.push(dbFile);

      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error("[UPLOAD API] File processing error for", file.name, ":", err.message);
        errors.push({
          file: file.name,
          error: err.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      errors: errors
    });

  } catch (error: unknown) {
    logger.error("[UPLOAD API] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}