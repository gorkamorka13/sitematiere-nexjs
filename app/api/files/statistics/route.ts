import { NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

// export const runtime = 'edge'; // Commenté pour le dev local

export async function GET() {
  // Vérifier l'authentification
  const session = await auth();
  if (!checkRole(session, [UserRole.ADMIN])) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    // 1. Calculer les statistiques à partir de la table File (Cloudflare)
    const stats = await prisma.file.aggregate({
      where: { isDeleted: false },
      _sum: { size: true },
      _count: { id: true }
    });

    const fileCounts = await prisma.file.groupBy({
      by: ['fileType'],
      where: { isDeleted: false },
      _count: { id: true }
    });

    const projectCount = await prisma.file.groupBy({
      by: ['projectId'],
      where: { isDeleted: false }
    });

    let totalImages = 0;
    let totalPdfs = 0;
    let totalVideos = 0;
    let totalOthers = 0;

    fileCounts.forEach((group) => {
      const count = group._count.id;
      if (group.fileType === 'IMAGE') totalImages = count;
      else if (group.fileType === 'DOCUMENT') totalPdfs = count;
      else if (group.fileType === 'VIDEO') totalVideos = count;
      else totalOthers += count; // Accumulate everything else
    });

    const totalSize = stats._sum.size || 0;
    const storageUsed = `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;

    const statistics = {
      totalImages,
      totalPdfs,
      totalVideos,
      totalOthers,
      storageUsed,
      storageLimit: "1 GB", // Cloudflare R2 Free Tier
      totalProjects: projectCount.length,
      orphanedFiles: 0,
      lastScan: new Date().toISOString(),
    };

    return NextResponse.json(statistics);
  } catch (error) {
    logger.error("Erreur lors du calcul des statistiques:", error);
    // En cas d'erreur de la nouvelle table, on pourrait fallback sur l'ancienne logique
    // mais ici on préfère renvoyer une erreur car la bascule est demandée.
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques" },
      { status: 500 }
    );
  }
}
