import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// export const runtime = 'edge'; // Commenté pour le dev local

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { fileIds } = body;

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: "No files specified" }, { status: 400 });
    }

    // Restore files (Soft delete = false)
    await prisma.file.updateMany({
      where: {
        id: { in: fileIds }
      },
      data: {
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      }
    });

    return NextResponse.json({ success: true, count: fileIds.length });

  } catch (error) {
    console.error("Restore files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
