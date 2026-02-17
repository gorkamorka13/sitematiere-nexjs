import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadFile, getFileTypeFromMime } from "@/lib/files/blob-edge";
import { validateFileSize, validateFileType, sanitizeFileName } from "@/lib/files/validation";
// Duplicate import removed

// Cloudflare Pages requires Edge Runtime for API routes
export const runtime = 'edge';


export async function POST(request: Request) {


  const session = await auth();


  // 1. Authentication Check - Allow both ADMIN and USER roles
  if (!session?.user) {

    return NextResponse.json({ error: "Access denied - Not authenticated" }, { status: 403 });
  }

  const userRole = session.user.role;
  if (userRole !== "ADMIN" && userRole !== "USER") {

    return NextResponse.json({ error: "Access denied - Insufficient permissions" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const projectId = formData.get("projectId") as string;

    let targetProjectId: string | null = projectId;
    let folderName = projectId;

    // Check if we are doing a global/unassigned upload
    if (!projectId || projectId === "global_unassigned") {
      targetProjectId = null;
      folderName = "global"; // Upload to a 'global' folder in Blob
    } else {
      // Verify project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      folderName = project.id;
    }

    const uploadedFiles = [];
    const errors = [];
    const overwrite = formData.get("overwrite") === "true";

    // 2. Process each file
    for (const file of files) {
      try {
        // Validation
        const sizeValidation = validateFileSize(file.size);
        if (!sizeValidation.valid) throw new Error(sizeValidation.error);

        const typeValidation = validateFileType(file.type, file.name);
        if (!typeValidation.valid) throw new Error(typeValidation.error);

        const sanitizedName = sanitizeFileName(file.name);
        const fileType = getFileTypeFromMime(file.type);

        // Conflict Detection
        const existingFile = await prisma.file.findFirst({
          where: {
            name: sanitizedName,
            projectId: targetProjectId,
            isDeleted: false
          }
        });

        if (existingFile && !overwrite) {
          return NextResponse.json({
            success: false,
            conflict: true,
            fileName: sanitizedName
          }, { status: 409 });
        }

        // If overwrite is true and exists, we should delete the old blob first
        if (existingFile && overwrite) {
          // Note: In a real production app, we'd call the blob deletion service here
          // For now, let's proceed with upload and we can either keep or delete old record
          // Better: delete the old record and blob
          try {
            // Delete blob if possible (implementation depends on storage backend)
            // For now, skip actual delete to be safe, but delete the DB record
            await prisma.file.delete({ where: { id: existingFile.id } });
          } catch (e) {
            console.error("Failed to delete existing file record", e);
          }
        }

        // Upload to Cloudflare R2
        const { url, pathname } = await uploadFile(file, folderName);

        const thumbnailUrl = null;
        const width = null;
        const height = null;
        const duration = null;

        // 3. Create DB Record
        const dbFile = await prisma.file.create({
          data: {
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
          }
        });

        uploadedFiles.push(dbFile);

      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("[UPLOAD API] File processing error for", file.name, ":", err.message);
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
    console.error("[UPLOAD API] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
