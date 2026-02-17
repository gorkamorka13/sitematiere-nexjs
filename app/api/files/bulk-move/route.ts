import { NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import prisma from "@/lib/prisma";

// export const runtime = 'edge'; // Commenté pour le dev local

export async function PATCH(request: Request) {
    const session = await auth();
    if (!checkRole(session, [UserRole.ADMIN])) {
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

        // Verify project exists
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) {
            return NextResponse.json({ error: "Target project not found" }, { status: 404 });
        }

        // Update all files in one transaction or one updateMany (if applicable)
        // updateMany doesn't support relation-based filtering easily if we had any,
        // but here we just update by IDs.
        const result = await prisma.file.updateMany({
            where: {
                id: { in: fileIds },
            },
            data: {
                projectId: projectId,
            },
        });

        return NextResponse.json({
            success: true,
            count: result.count,
            message: `${result.count} fichier(s) déplacé(s) avec succès`
        });
    } catch (error) {
        console.error("Bulk move error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
