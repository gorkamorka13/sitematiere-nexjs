import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET() {
  // Vérifier l'authentification
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  try {
    const publicDir = path.join(process.cwd(), "public");
    const imagesDir = path.join(publicDir, "images");
    
    let totalImages = 0;
    let totalPdfs = 0;
    let totalSize = 0;
    let totalProjects = 0;

    // Vérifier si le répertoire images existe
    if (fs.existsSync(imagesDir)) {
      const projectDirs = fs.readdirSync(imagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory());
      
      totalProjects = projectDirs.length;

      for (const projectDir of projectDirs) {
        const projectPath = path.join(imagesDir, projectDir.name);
        const files = fs.readdirSync(projectPath);

        for (const file of files) {
          const filePath = path.join(projectPath, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;

          const ext = path.extname(file).toLowerCase();
          if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
            totalImages++;
          } else if (ext === ".pdf") {
            totalPdfs++;
          }
        }
      }
    }

    // Formater la taille en MB
    const storageUsed = `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;

    const statistics = {
      totalImages,
      totalPdfs,
      storageUsed,
      storageLimit: "1 GB",
      totalProjects,
      orphanedFiles: 0, // TODO: Implémenter la logique de détection des fichiers orphelins
      lastScan: new Date().toISOString(),
    };

    return NextResponse.json(statistics);
  } catch (error) {
    console.error("Erreur lors du calcul des statistiques:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des statistiques" },
      { status: 500 }
    );
  }
}
