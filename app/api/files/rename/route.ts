import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { files, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeFileName } from "@/lib/files/validation";
import { logger } from "@/lib/logger";

export async function PUT(request: Request) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileId, newName } = body;

    if (!fileId || !newName) {
      return NextResponse.json({ error: "File ID and new name are required" }, { status: 400 });
    }

    const sanitizedName = sanitizeFileName(newName);

    const currentFileRecords = await db.select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);

    const currentFile = currentFileRecords[0];
    if (!currentFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await db.update(files)
      .set({ name: sanitizedName })
      .where(eq(files.id, fileId));

    if (currentFile.blobUrl) {
      await db.update(images)
        .set({ alt: sanitizedName })
        .where(eq(images.url, currentFile.blobUrl));
    }

    return NextResponse.json({ success: true, name: sanitizedName });

  } catch (error) {
    logger.error("Rename file error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}