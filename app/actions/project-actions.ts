"use server";

import { db } from "@/lib/db";
import { users, projects, documents, files } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
import { auth, checkRole } from "@/lib/auth";
import { hash } from "bcrypt-ts";
import type { UserRole } from "@/lib/auth-types";
import { ProjectUpdateSchema, ProjectUpdateInput, ProjectCreateSchema, ProjectCreateInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/storage/r2-operations";
import { logger } from "@/lib/logger";
import { DocumentType } from "@/lib/enums";
import { R2_PUBLIC_URL } from "@/lib/constants";

export async function updateProject(formData: ProjectUpdateInput) {
  const session = await auth();

  if (!checkRole(session, ["ADMIN", "USER"] as UserRole[])) {
    throw new Error("Action non autorisée. Seuls les administrateurs et utilisateurs autorisés peuvent modifier les projets.");
  }

  const validatedData = ProjectUpdateSchema.parse(formData);

  try {
    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, validatedData.id))
      .limit(1);

    if (!project) {
      return { success: false, error: "Projet introuvable." };
    }

    const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
    const isOwner = project.ownerId === session?.user?.id;

    if (!isAdmin && !isOwner) {
      return { success: false, error: "Vous n'êtes pas autorisé à modifier ce projet." };
    }

    await db.transaction(async (tx) => {
      const updateData: any = {
        latitude: validatedData.latitude,
        longitude: validatedData.longitude,
        description: validatedData.description,
        prospection: validatedData.prospection,
        studies: validatedData.studies,
        fabrication: validatedData.fabrication,
        transport: validatedData.transport,
        construction: validatedData.construction,
        status: validatedData.status,
        updatedAt: new Date(),
      };

      if (validatedData.visible !== undefined) {
        updateData.visible = validatedData.visible;
      }

      // Seul l'admin peut changer le propriétaire
      if (isAdmin && validatedData.ownerId) {
        updateData.ownerId = validatedData.ownerId;
      }

      await tx.update(projects)
        .set(updateData)
        .where(eq(projects.id, validatedData.id));

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

        const existingPin = await tx.select()
          .from(documents)
          .where(and(
            eq(documents.projectId, validatedData.id),
            eq(documents.type, DocumentType.PIN)
          ))
          .limit(1);

        if (existingPin.length > 0) {
          await tx.update(documents)
            .set({ url: pinUrl, name: "Pin Carte (Auto)" })
            .where(eq(documents.id, existingPin[0].id));
        } else {
          await tx.insert(documents)
            .values({
              projectId: validatedData.id,
              type: DocumentType.PIN,
              url: pinUrl,
              name: "Pin Carte (Auto)",
            });
        }
      }

      if (validatedData.flagName !== undefined) {
        const existingFlag = await tx.select()
          .from(documents)
          .where(and(
            eq(documents.projectId, validatedData.id),
            eq(documents.type, DocumentType.FLAG)
          ))
          .limit(1);

        if (validatedData.flagName !== "") {
          if (existingFlag.length > 0) {
            await tx.update(documents)
              .set({ url: validatedData.flagName })
              .where(eq(documents.id, existingFlag[0].id));
          } else {
            await tx.insert(documents)
              .values({
                projectId: validatedData.id,
                type: DocumentType.FLAG,
                url: validatedData.flagName,
                name: "Drapeau",
              });
          }
        } else if (existingFlag.length > 0) {
          await tx.delete(documents)
            .where(eq(documents.id, existingFlag[0].id));
        }
      }

      if (validatedData.clientLogoName !== undefined) {
        const existingLogo = await tx.select()
          .from(documents)
          .where(and(
            eq(documents.projectId, validatedData.id),
            eq(documents.type, DocumentType.CLIENT_LOGO)
          ))
          .limit(1);

        if (validatedData.clientLogoName !== "") {
          if (existingLogo.length > 0) {
            await tx.update(documents)
              .set({ url: validatedData.clientLogoName })
              .where(eq(documents.id, existingLogo[0].id));
          } else {
            await tx.insert(documents)
              .values({
                projectId: validatedData.id,
                type: DocumentType.CLIENT_LOGO,
                url: validatedData.clientLogoName,
                name: "Logo Client",
              });
          }
        } else if (existingLogo.length > 0) {
          await tx.delete(documents)
            .where(eq(documents.id, existingLogo[0].id));
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

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent créer des projets.");
  }

  const validatedData = ProjectCreateSchema.parse(formData);

  try {
    const result = await db.transaction(async (tx) => {
      let determinedOwnerId = session?.user?.id as string;

      // Logique d'affectation
      if (validatedData.assignToUserId) {
        const [existingUser] = await tx.select()
          .from(users)
          .where(eq(users.id, validatedData.assignToUserId))
          .limit(1);

        if (existingUser) {
          determinedOwnerId = existingUser.id;
        } else if (validatedData.createUserIfNotExists && validatedData.newUserUsername && validatedData.newUserPassword) {
          // Création à la volée
          const passwordHash = await hash(validatedData.newUserPassword, 10);
          const [newUser] = await tx.insert(users)
            .values({
              username: validatedData.newUserUsername,
              name: validatedData.newUserName || null,
              passwordHash,
              role: (validatedData.newUserRole as UserRole) || "USER",
              color: "#6366f1", // Couleur par défaut
            })
            .returning();
          determinedOwnerId = newUser.id;
        } else {
          throw new Error("L'utilisateur spécifié n'existe pas.");
        }
      }

      const [project] = await tx.insert(projects)
        .values({
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
          ownerId: determinedOwnerId,
          visible: validatedData.visible ?? false,
        })
        .returning();

      if (validatedData.flagName && validatedData.flagName !== "") {
        await tx.insert(documents)
          .values({
            projectId: project.id,
            type: DocumentType.FLAG,
            url: validatedData.flagName,
            name: "Drapeau",
          });
      }

      if (validatedData.clientLogoName && validatedData.clientLogoName !== "") {
        await tx.insert(documents)
          .values({
            projectId: project.id,
            type: DocumentType.CLIENT_LOGO,
            url: validatedData.clientLogoName,
            name: "Logo Client",
          });
      }

      let pinUrl = validatedData.pinName;
      if (!pinUrl || pinUrl === "") {
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

      await tx.insert(documents)
        .values({
          projectId: project.id,
          type: DocumentType.PIN,
          url: pinUrl,
          name: "Pin Carte",
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

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent supprimer des projets.");
  }

  try {
    const project = await db.select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project.length === 0) {
      return { success: false, error: "Projet introuvable." };
    }

    if (project[0].name !== confirmName) {
      return { success: false, error: "Le nom de confirmation ne correspond pas au nom du projet." };
    }

    const fileRecords = await db.select({ blobUrl: files.blobUrl, blobPath: files.blobPath })
      .from(files)
      .where(eq(files.projectId, projectId));

    if (fileRecords.length > 0) {
      await Promise.all(
        fileRecords.map((file) => {
          const key = file.blobPath || extractKeyFromUrl(file.blobUrl);
          return deleteFromR2(key).catch((err) => logger.error(`Erreur suppression R2 ${key}:`, err));
        })
      );
    }

    await db.delete(projects)
      .where(eq(projects.id, projectId));

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la suppression du projet:", error);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
