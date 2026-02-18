import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, files, fileTypeEnum } from "@/lib/db/schema";
import { eq, and, isNull, ilike, sql, inArray } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { naturalSort } from "@/lib/sort-utils";

type FileType = typeof fileTypeEnum.enumValues[number];

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Access denied" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const fileType = searchParams.get("fileType") as FileType | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "1200");
  const search = searchParams.get("search");
  const country = searchParams.get("country");

  try {
    const conditions = [eq(files.isDeleted, false)];

    if (projectId) {
      if (projectId === "ORPHANED") {
        conditions.push(isNull(files.projectId));
      } else {
        conditions.push(eq(files.projectId, projectId));
      }
    }

    if (country && country !== "Tous") {
      if (country === "Autre") {
        conditions.push(isNull(files.projectId));
      } else {
        const projectsInCountry = await db.select({ id: projects.id })
          .from(projects)
          .where(eq(projects.country, country));
        
        if (projectsInCountry.length > 0) {
          const projectIds = projectsInCountry.map(p => p.id);
          conditions.push(inArray(files.projectId, projectIds));
        } else {
          conditions.push(sql`1 = 0`);
        }
      }
    }

    if (fileType) {
      conditions.push(eq(files.fileType, fileType));
    }

    if (search) {
      conditions.push(ilike(files.name, `%${search}%`));
    }

    const [fileRecords, totalResult] = await Promise.all([
      db.select({
        id: files.id,
        name: files.name,
        blobUrl: files.blobUrl,
        blobPath: files.blobPath,
        thumbnailUrl: files.thumbnailUrl,
        fileType: files.fileType,
        size: files.size,
        mimeType: files.mimeType,
        createdAt: files.createdAt,
        projectId: files.projectId,
        project: {
          id: projects.id,
          name: projects.name,
          country: projects.country,
        }
      })
        .from(files)
        .leftJoin(projects, eq(files.projectId, projects.id))
        .where(and(...conditions))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ count: sql<number>`count(*)` })
        .from(files)
        .where(and(...conditions))
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    const sortedFiles = naturalSort(fileRecords, 'name');

    const serializedFiles = sortedFiles.map(f => ({
      ...f,
      createdAt: f.createdAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      files: serializedFiles,
      total,
      hasMore: total > page * limit,
      page,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    logger.error("List files error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}