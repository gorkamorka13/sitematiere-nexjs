import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// export const runtime = 'edge'; // Commenté pour le dev local


export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileIds, permanent } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    if (permanent) {
      // Hard delete not implemented yet to be safe, but typically would remove from Blob then DB
      // For Phase 2 we are focusing on Soft Delete as per spec
      // If permanent is requested, we could implement it, but spec says "Soft delete default"
      // Let's implement Soft Delete first.
    }

    // Soft delete
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

    return NextResponse.json({ success: true, count: fileIds.length });

  } catch (error) {
    console.error("Delete files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
