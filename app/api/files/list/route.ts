import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { FileType, Prisma } from "@prisma/client";
import { naturalSort } from "@/lib/sort-utils";

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
  const country = searchParams.get("country");

  try {
    const where: Prisma.FileWhereInput = {
      isDeleted: false,
    };

    if (projectId) {
      if (projectId === "ORPHANED") {
        where.projectId = { equals: null };
      } else {
        where.projectId = projectId;
      }
    }

    if (country && country !== "Tous") {
      if (country === "Autre") {
        where.OR = [
          { project: { is: null } },
          { projectId: { equals: null } }
        ];
      } else {
        where.project = {
          country: country
        };
      }
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
        select: {
          id: true,
          name: true,
          blobUrl: true,
          blobPath: true,
          thumbnailUrl: true,
          fileType: true,
          size: true,
          mimeType: true,
          createdAt: true,
          projectId: true,
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

    const sortedFiles = naturalSort(files, 'name');

    return NextResponse.json({
      files: sortedFiles,
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
