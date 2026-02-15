"use server";

import prisma from "@/lib/prisma";
import { naturalSort } from "@/lib/sort-utils";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/enums";

export async function getProjectMedia(projectName: string) {
  // Normalisation du nom de projet pour correspondre aux dossiers
  const folderName = projectName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const session = await auth();
  const userRole = session?.user?.role || UserRole.VISITOR;

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
      // 1. Chercher d'abord les images définies dans le slideshow (respecte l'ordre manuel)
      const slideshowImages = await prisma.slideshowImage.findMany({
        where: { projectId: project.id },
        include: { image: true },
        orderBy: { order: 'asc' }
      });

      if (slideshowImages.length > 0) {
        result.images = slideshowImages.map(si => ({
          url: si.image.url,
          name: si.image.alt || si.image.url.split('/').pop() || 'Photo'
        }));
      }

      // 2. Chercher les fichiers (Table File) pour les PDFs et fallback images
      const files = await prisma.file.findMany({
        where: {
          projectId: project.id,
          isDeleted: false
        },
        orderBy: { name: 'asc' }
      });

      if (files.length > 0) {
        files.forEach((file) => {
          // Si on n'a pas de slideshow défini, on prend les images du dossier File
          if (slideshowImages.length === 0 && file.fileType === 'IMAGE') {
            result.images.push({ url: file.blobUrl, name: file.name });
          }
          // Dans tous les cas, on prend les PDFs - SAUF pour les visiteurs
          else if (file.fileType === 'DOCUMENT' && file.mimeType === 'application/pdf' && userRole !== UserRole.VISITOR) {
            result.pdfs.push({ url: file.blobUrl, name: file.name });
          }
        });

        // Appliquer le tri naturel uniquement si on utilise le fallback images ou pour les PDFs
        if (slideshowImages.length === 0) {
          result.images = naturalSort(result.images, 'name');
        }
        result.pdfs = naturalSort(result.pdfs, 'name');

        return result;
      }
    }

    // 2. Note: Le fallback local (scan de dossier) a été supprimé
    // car il nécessite fs/path qui ne fonctionnent pas sur Cloudflare Edge Runtime
    // Tous les fichiers doivent désormais être stockés en base de données (table File)

  } catch (error) {
    console.error(`Error fetching media for ${projectName}:`, error);
  }

  return result;
}
