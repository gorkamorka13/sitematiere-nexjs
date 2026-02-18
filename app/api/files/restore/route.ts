import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileIds } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    await db.update(files)
      .set({
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      })
      .where(inArray(files.id, fileIds));

    return NextResponse.json({ success: true, count: fileIds.length });

  } catch (error) {
    logger.error("Restore files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}