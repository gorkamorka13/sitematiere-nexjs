"use server";

import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function getProjectMedia(projectName: string) {
  // Normalisation du nom de projet pour correspondre aux dossiers
  const folderName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const result = {
    images: [] as { url: string; name: string }[],
    pdfs: [] as { url: string; name: string }[],
  };

  if (!folderName) return result;

  try {
    // 1. Chercher d'abord dans la base de données (Table File migrée)
    // On cherche soit via le folderName (utilisé comme préfixe dans blobPath)
    // soit via le projet lui-même si on trouve la correspondance
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: projectName, mode: 'insensitive' } },
          { id: folderName } // fallback sur ID
        ]
      }
    });

    if (project) {
      const files = await prisma.file.findMany({
        where: {
          projectId: project.id,
          isDeleted: false
        },
        orderBy: { name: 'asc' }
      });

      if (files.length > 0) {
        files.forEach((file: any) => { // Using any as a quick fix for type mismatch in some editors
          if (file.fileType === 'IMAGE') {
            result.images.push({ url: file.blobUrl, name: file.name });
          } else if (file.fileType === 'DOCUMENT' && file.mimeType === 'application/pdf') {
            result.pdfs.push({ url: file.blobUrl, name: file.name });
          }
        });

        // Si on a trouvé des fichiers en BDD, on les renvoie en priorité
        if (result.images.length > 0 || result.pdfs.length > 0) {
          return result;
        }
      }
    }

    // 2. FALLBACK: Si rien en BDD, on scanne le dossier local (Transition/Ancien système)
    const publicDir = path.join(process.cwd(), "public");
    const mediaPath = path.join(publicDir, "images", folderName);

    if (fs.existsSync(mediaPath)) {
      const files = fs.readdirSync(mediaPath);

      files.forEach((file) => {
        const ext = path.extname(file).toLowerCase();
        const relativeUrl = `images/${folderName}/${file}`;

        if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
          result.images.push({
            url: relativeUrl,
            name: path.parse(file).name,
          });
        } else if (ext === ".pdf") {
          result.pdfs.push({
            url: relativeUrl,
            name: file,
          });
        }
      });
    }

    // Tri naturel pour le fallback local
    result.images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    result.pdfs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  } catch (error) {
    console.error(`Error fetching media for ${projectName}:`, error);
  }

  return result;
}
