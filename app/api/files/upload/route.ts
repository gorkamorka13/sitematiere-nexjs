import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { uploadFile, generateThumbnail, generateVideoThumbnail, getFileTypeFromMime } from "@/lib/files/blob-client";
import { validateFileSize, validateFileType, sanitizeFileName } from "@/lib/files/validation";
import { FileType } from "@prisma/client";

export const runtime = 'edge';

export async function POST(request: Request) {
  const session = await auth();

  // 1. Authentication Check
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
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

        // Upload to Vercel Blob
        const { url, pathname } = await uploadFile(file, folderName);

        let thumbnailUrl = null;
        let width = null;
        let height = null;
        let duration = null;

        // Generate thumbnail for images
        if (fileType === FileType.IMAGE) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const thumbnailBuffer = await generateThumbnail(buffer);

            // Upload thumbnail
            const thumbFile = new File([new Uint8Array(thumbnailBuffer)], `thumb_${sanitizedName}`, { type: "image/jpeg" });
            const thumbUpload = await uploadFile(thumbFile, `${folderName}/thumbnails`);
            thumbnailUrl = thumbUpload.url;

            // Get dimensions (optional, requires metadata extraction which we skipped for now)
          } catch (e) {
            console.error("Error generating image thumbnail:", e);
            // Continue without thumbnail
          }
        }
        // Generate thumbnail for videos
        else if (fileType === FileType.VIDEO) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const thumbnailBuffer = await generateVideoThumbnail(buffer);

            // Upload thumbnail
            const thumbFile = new File([new Uint8Array(thumbnailBuffer)], `thumb_${sanitizedName}.jpg`, { type: "image/jpeg" });
            const thumbUpload = await uploadFile(thumbFile, `${folderName}/thumbnails`);
            thumbnailUrl = thumbUpload.url;
          } catch (e) {
            console.error("Error generating video thumbnail:", e);
            // Continue without thumbnail
          }
        }

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

      } catch (error: any) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      errors: errors
    });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
