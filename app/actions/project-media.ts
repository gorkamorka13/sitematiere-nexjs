"use server";

import fs from "fs";
import path from "path";

export async function getProjectMedia(projectName: string) {
  // Normalisation du nom de projet pour correspondre aux dossiers
  // Sécurité: n'autoriser que les caractères alphanumériques pour éviter la traversée de répertoire
  const folderName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const result = {
    images: [] as { url: string; name: string }[],
    pdfs: [] as { url: string; name: string }[],
  };

  // Validation: le nom du dossier ne doit pas être vide
  if (!folderName || folderName.length === 0) {
    return result;
  }

  const publicDir = path.join(process.cwd(), "public");
  const mediaPath = path.join(publicDir, "images", folderName);

  if (!fs.existsSync(mediaPath)) {
    return result;
  }

  try {
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

    // Tri naturel (1, 2, ..., 10)
    result.images.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    result.pdfs.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

  } catch (error) {
    console.error(`Error reading directory ${mediaPath}:`, error);
  }

  return result;
}
