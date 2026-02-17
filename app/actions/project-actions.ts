"use server";

import prisma from "@/lib/prisma";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { ProjectUpdateSchema, ProjectUpdateInput, ProjectCreateSchema, ProjectCreateInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";
import { DocumentType } from "@/lib/enums";
import { R2_PUBLIC_URL } from "@/lib/constants";

export async function updateProject(formData: ProjectUpdateInput) {
  const session = await auth();

  // Vérification de l'authentification et du rôle
  if (!checkRole(session, [UserRole.ADMIN, UserRole.USER])) {
    throw new Error("Action non autorisée. Seuls les administrateurs et utilisateurs autorisés peuvent modifier les projets.");
  }

  // Validation des données
  const validatedData = ProjectUpdateSchema.parse(formData);

  try {
    await prisma.$transaction(async (tx) => {
      // Mise à jour du projet
      await tx.project.update({
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

        const existingPin = await tx.document.findFirst({
          where: { projectId: validatedData.id, type: DocumentType.PIN }
        });

        if (existingPin) {
          await tx.document.update({
            where: { id: existingPin.id },
            data: { url: pinUrl, name: "Pin Carte (Auto)" }
          });
        } else {
          await tx.document.create({
            data: {
              projectId: validatedData.id,
              type: DocumentType.PIN,
              url: pinUrl,
              name: "Pin Carte (Auto)",
            }
          });
        }
      }

      // Mise à jour ou création du document "FLAG"
      if (validatedData.flagName !== undefined) {
        const existingFlag = await tx.document.findFirst({
          where: { projectId: validatedData.id, type: DocumentType.FLAG }
        });

        if (validatedData.flagName !== "") {
          if (existingFlag) {
            await tx.document.update({
              where: { id: existingFlag.id },
              data: { url: validatedData.flagName }
            });
          } else {
            await tx.document.create({
              data: {
                projectId: validatedData.id,
                type: DocumentType.FLAG,
                url: validatedData.flagName,
                name: "Drapeau",
              }
            });
          }
        } else if (existingFlag) {
          // Supprimer l'association si le champ est vidé
          await tx.document.delete({
            where: { id: existingFlag.id }
          });
        }
      }

      // Mise à jour ou création du document "CLIENT_LOGO"
      if (validatedData.clientLogoName !== undefined) {
        const existingLogo = await tx.document.findFirst({
          where: { projectId: validatedData.id, type: DocumentType.CLIENT_LOGO }
        });

        if (validatedData.clientLogoName !== "") {
          if (existingLogo) {
            await tx.document.update({
              where: { id: existingLogo.id },
              data: { url: validatedData.clientLogoName }
            });
          } else {
            await tx.document.create({
              data: {
                projectId: validatedData.id,
                type: DocumentType.CLIENT_LOGO,
                url: validatedData.clientLogoName,
                name: "Logo Client",
              }
            });
          }
        } else if (existingLogo) {
          // Supprimer l'association si le champ est vidé
          await tx.document.delete({
            where: { id: existingLogo.id }
          });
        }
      }
    });

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
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
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
        await tx.document.create({
          data: {
            projectId: project.id,
            type: DocumentType.FLAG,
            url: validatedData.flagName,
            name: "Drapeau",
          }
        });
      }

      // Créer le document "CLIENT_LOGO" si fourni
      if (validatedData.clientLogoName && validatedData.clientLogoName !== "") {
        await tx.document.create({
          data: {
            projectId: project.id,
            type: DocumentType.CLIENT_LOGO,
            url: validatedData.clientLogoName,
            name: "Logo Client",
          }
        });
      }

      // Créer le document "PIN" - utiliser le pin personnalisé si fourni, sinon assigner selon le statut
      let pinUrl = validatedData.pinName;
      if (!pinUrl || pinUrl === "") {
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

      await tx.document.create({
        data: {
          projectId: project.id,
          type: DocumentType.PIN,
          url: pinUrl,
          name: "Pin Carte",
        }
      });

      return project;
    });

    revalidatePath("/");

    return { success: true, projectId: result.id };
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
