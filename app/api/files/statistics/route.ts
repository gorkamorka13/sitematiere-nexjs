import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/logger";

export async function GET() {
  const session = await auth();
  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const statsResult = await db.select({
      totalSize: sql<number>`sum(${files.size})`,
    })
      .from(files)
      .where(eq(files.isDeleted, false));

    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.isDeleted, false));

    const totalSize = Number(statsResult[0]?.totalSize ?? 0);
    // const totalCount = Number(statsResult[0]?.totalCount ?? 0); // Removed as per instruction
    const totalCount = Number(totalCountResult[0]?.count ?? 0); // Added to get totalCount from new query

    const fileCounts = await db.select({
      fileType: files.fileType,
      count: sql<number>`count(*)`
    })
      .from(files)
      .where(eq(files.isDeleted, false))
      .groupBy(files.fileType);

    const projectCountResult = await db.select({
      projectId: files.projectId
    })
      .from(files)
      .where(eq(files.isDeleted, false))
      .groupBy(files.projectId);

    let totalImages = 0;
    let totalPdfs = 0;
    let totalVideos = 0;
    let totalOthers = 0;

    fileCounts.forEach((group) => {
      const count = Number(group.count);
      if (group.fileType === 'IMAGE') totalImages = count;
      else if (group.fileType === 'DOCUMENT') totalPdfs = count;
      else if (group.fileType === 'VIDEO') totalVideos = count;
      else totalOthers += count;
    });

    const storageUsed = `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;

    const statistics = {
      totalImages,
      totalPdfs,
      totalVideos,
      totalOthers,
      storageUsed,
      storageLimit: "1 GB",
      totalProjects: projectCountResult.length,
      orphanedFiles: 0,
      lastScan: new Date().toISOString(),
    };

    return NextResponse.json(statistics);
  } catch (error) {
    logger.error("Erreur lors du calcul des statistiques:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques" },
      { status: 500 }
    );
  }
}
