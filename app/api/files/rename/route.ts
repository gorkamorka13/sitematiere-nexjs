import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeFileName } from "@/lib/files/validation";

// export const runtime = 'edge'; // Commenté pour le dev local

export async function PUT(request: Request) {
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileId, newName } = body;

    if (!fileId || !newName) {
      return NextResponse.json({ error: "File ID and new name are required" }, { status: 400 });
    }

    const sanitizedName = sanitizeFileName(newName);

    // Check if name already exists in project (optional but good practice)
    const currentFile = await prisma.file.findUnique({ where: { id: fileId } });
    if (!currentFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Update DB (File table)
    await prisma.file.update({
      where: { id: fileId },
      data: { name: sanitizedName }
    });

    // Synchronize with Image table (used by slideshows)
    // We update the 'alt' field for all images that match this file's URL
    if (currentFile.blobUrl) {
      await prisma.image.updateMany({
        where: { url: currentFile.blobUrl },
        data: { alt: sanitizedName }
      });
    }

    // Note: We don't rename the Blob file itself because it's complicated (copy + delete)
    // and not strictly necessary as long as the DB link works.
    // The displayName is what matters to the user.

    return NextResponse.json({ success: true, name: sanitizedName });

  } catch (error) {
    console.error("Rename file error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
