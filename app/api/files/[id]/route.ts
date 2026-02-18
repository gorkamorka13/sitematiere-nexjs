import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { projects, files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeFileName } from "@/lib/files/validation";
import { logger } from "@/lib/logger";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, projectId } = body;

    if (!name && !projectId) {
      return NextResponse.json({ error: "Name or ProjectId is required" }, { status: 400 });
    }

    const existingFile = await db.select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);

    if (existingFile.length === 0) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const dataToUpdate: { name?: string; projectId?: string } = {};
    if (name) dataToUpdate.name = sanitizeFileName(name);
    if (projectId) {
      const project = await db.select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);
      if (project.length === 0) return NextResponse.json({ error: "Target project not found" }, { status: 404 });
      dataToUpdate.projectId = projectId;
    }

    const [updatedFile] = await db.update(files)
      .set(dataToUpdate)
      .where(eq(files.id, id))
      .returning();

    return NextResponse.json(updatedFile);
  } catch (error) {
    logger.error("Rename error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not implemented" }, { status: 405 });
}