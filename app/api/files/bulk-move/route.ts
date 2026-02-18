import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { projects, files } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function PATCH(request: Request) {
    const session = await auth();
    if (!checkRole(session, ["ADMIN"] as UserRole[])) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
        const { fileIds, projectId } = await request.json();

        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return NextResponse.json({ error: "File IDs are required" }, { status: 400 });
        }

        if (!projectId) {
            return NextResponse.json({ error: "ProjectId is required" }, { status: 400 });
        }

        const projectRecords = await db.select()
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);

        if (projectRecords.length === 0) {
            return NextResponse.json({ error: "Target project not found" }, { status: 404 });
        }

        const result = await db.update(files)
            .set({ projectId: projectId })
            .where(inArray(files.id, fileIds))
            .returning();

        return NextResponse.json({
            success: true,
            count: result.length,
            message: `${result.length} fichier(s) déplacé(s) avec succès`
        });
    } catch (error) {
        logger.error("Bulk move error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}