import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FileType, Prisma } from "@prisma/client";

export const runtime = 'edge';


export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const fileType = searchParams.get("fileType") as FileType | null;
  const page = parseInt(searchParams.get("page") || "1");
  // Increased default limit to 1200 to show all files in dropdowns
  const limit = parseInt(searchParams.get("limit") || "1200");
  const search = searchParams.get("search");

  if (!projectId) {
    // If no projectId provided, we list ALL files (Admin mode) or handle orphan logic?
    // For now, let's just NOT fail.
  }

  try {
    const where: Prisma.FileWhereInput = {
      isDeleted: false,
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (fileType) {
      where.fileType = fileType;
    }

    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { name: "asc" }, // Sort alphabetically by name
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              country: true,
            }
          }
        }
      }),
      prisma.file.count({ where }),
    ]);

    return NextResponse.json({
      files,
      total,
      hasMore: total > page * limit,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("List files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
