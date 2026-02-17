"use server";

import prisma from "@/lib/prisma";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { ProjectUpdateSchema, ProjectUpdateInput, ProjectCreateSchema, ProjectCreateInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";

export async function updateProject(formData: ProjectUpdateInput) {
  const session = await auth();

  // Vérification de l'authentification et du rôle
  if (!checkRole(session, [UserRole.ADMIN, UserRole.USER])) {
    throw new Error("Action non autorisée. Seuls les administrateurs et utilisateurs autorisés peuvent modifier les projets.");
  }

  // Validation des données
  const validatedData = ProjectUpdateSchema.parse(formData);

  try {
    // Mise à jour du projet
    await prisma.project.update({
      where: { id: validatedData.id },
      data: {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        description: validatedData.description,
        prospection: validatedData.prospection,
        studies: validatedData.studies,
        fabrication: validatedData.fabrication,
        transport: validatedData.transport,
        construction: validatedData.construction,
        status: validatedData.status,
      },
    });

    // Mise à jour automatique du document "PIN" basé sur le statut
    if (validatedData.status) {
      const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev";
      let pinUrl = "";

      switch (validatedData.status) {
        case 'DONE':
          pinUrl = `${R2_PUBLIC_URL}/pins/realise.png`;
          break;
        case 'CURRENT':
          pinUrl = `${R2_PUBLIC_URL}/pins/en_cours.png`;
          break;
        case 'PROSPECT':
        default:
          pinUrl = `${R2_PUBLIC_URL}/pins/prospection.png`;
          break;
      }

      const existingPin = await prisma.document.findFirst({
        where: { projectId: validatedData.id, type: "PIN" }
      });

      if (existingPin) {
        await prisma.document.update({
          where: { id: existingPin.id },
          data: { url: pinUrl, name: "Pin Carte (Auto)" }
        });
      } else {
        await prisma.document.create({
          data: {
            projectId: validatedData.id,
            type: "PIN",
            url: pinUrl,
            name: "Pin Carte (Auto)",
          }
        });
      }
    }

    // Mise à jour ou création du document "FLAG"
    if (validatedData.flagName !== undefined) {
      const existingFlag = await prisma.document.findFirst({
        where: { projectId: validatedData.id, type: "FLAG" }
      });

      if (validatedData.flagName !== "") {
        if (existingFlag) {
          await prisma.document.update({
            where: { id: existingFlag.id },
            data: { url: validatedData.flagName }
          });
        } else {
          await prisma.document.create({
            data: {
              projectId: validatedData.id,
              type: "FLAG",
              url: validatedData.flagName,
              name: "Drapeau",
            }
          });
        }
      } else if (existingFlag) {
        // Supprimer l'association si le champ est vidé
        await prisma.document.delete({
          where: { id: existingFlag.id }
        });
      }
    }

    // Mise à jour ou création du document "CLIENT_LOGO"
    if (validatedData.clientLogoName !== undefined) {
      const existingLogo = await prisma.document.findFirst({
        where: { projectId: validatedData.id, type: "CLIENT_LOGO" }
      });

      if (validatedData.clientLogoName !== "") {
        if (existingLogo) {
          await prisma.document.update({
            where: { id: existingLogo.id },
            data: { url: validatedData.clientLogoName }
          });
        } else {
          await prisma.document.create({
            data: {
              projectId: validatedData.id,
              type: "CLIENT_LOGO",
              url: validatedData.clientLogoName,
              name: "Logo Client",
            }
          });
        }
      } else if (existingLogo) {
        // Supprimer l'association si le champ est vidé
        await prisma.document.delete({
          where: { id: existingLogo.id }
        });
      }
    }



    revalidatePath("/");
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la mise à jour du projet:", error);
    return { success: false, error: "Erreur lors de la mise à jour en base de données." };
  }
}

export async function createProject(formData: ProjectCreateInput) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent créer des projets.");
  }

  const validatedData = ProjectCreateSchema.parse(formData);

  try {
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        country: validatedData.country,
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        type: validatedData.type,
        status: validatedData.status,
        description: validatedData.description,
        projectCode: validatedData.projectCode,
        prospection: validatedData.prospection,
        studies: validatedData.studies,
        fabrication: validatedData.fabrication,
        transport: validatedData.transport,
        construction: validatedData.construction,
        ownerId: session.user.id as string,
      },
    });

    // Créer le document "FLAG" si fourni
    if (validatedData.flagName && validatedData.flagName !== "") {
      await prisma.document.create({
        data: {
          projectId: project.id,
          type: "FLAG",
          url: validatedData.flagName,
          name: "Drapeau",
        }
      });
    }

    // Créer le document "CLIENT_LOGO" si fourni
    if (validatedData.clientLogoName && validatedData.clientLogoName !== "") {
      await prisma.document.create({
        data: {
          projectId: project.id,
          type: "CLIENT_LOGO",
          url: validatedData.clientLogoName,
          name: "Logo Client",
        }
      });
    }

    // Créer le document "PIN" - utiliser le pin personnalisé si fourni, sinon assigner selon le statut
    let pinUrl = validatedData.pinName;
    if (!pinUrl || pinUrl === "") {
      const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev";
      // Assigner un pin par défaut selon le statut
      switch (validatedData.status) {
        case 'DONE':
          pinUrl = `${R2_PUBLIC_URL}/pins/realise.png`;
          break;
        case 'CURRENT':
          pinUrl = `${R2_PUBLIC_URL}/pins/en_cours.png`;
          break;
        case 'PROSPECT':
        default:
          pinUrl = `${R2_PUBLIC_URL}/pins/prospection.png`;
          break;
      }
    }

    await prisma.document.create({
      data: {
        projectId: project.id,
        type: "PIN",
        url: pinUrl,
        name: "Pin Carte",
      }
    });

    revalidatePath("/");

    return { success: true, projectId: project.id };
  } catch (error) {
    logger.error("Erreur lors de la création du projet:", error);
    return { success: false, error: "Erreur lors de la création en base de données." };
  }
}

export async function deleteProject(projectId: string, confirmName: string) {
  const session = await auth();

  if (!checkRole(session, [UserRole.ADMIN])) {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent supprimer des projets.");
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });

    if (!project) {
      return { success: false, error: "Projet introuvable." };
    }

    if (project.name !== confirmName) {
      return { success: false, error: "Le nom de confirmation ne correspond pas au nom du projet." };
    }

    // Récupérer tous les fichiers associés pour nettoyage R2
    const files = await prisma.file.findMany({
      where: { projectId },
      select: { blobUrl: true, blobPath: true },
    });

    // Supprimer les fichiers de R2
    if (files.length > 0) {
      await Promise.all(
        files.map((file) => {
          const key = file.blobPath || extractKeyFromUrl(file.blobUrl);
          return deleteFromR2(key).catch((err) => logger.error(`Erreur suppression R2 ${key}:`, err));
        })
      );
    }

    // Supprimer le projet (cascade DB gérera les entrées Document, Image, Video, File)
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la suppression du projet:", error);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
