"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProjectUpdateSchema, ProjectUpdateInput, ProjectCreateSchema, ProjectCreateInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { del } from "@vercel/blob";

export async function updateProject(formData: ProjectUpdateInput) {
  const session = await auth();

  // Vérification de l'authentification et du rôle
  if (!session) {
    throw new Error("Vous devez être connecté pour effectuer cette action.");
  }

  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN" && userRole !== "USER") {
    throw new Error("Action non autorisée. Seuls les administrateurs et utilisateurs autorisés peuvent modifier les projets.");
  }

  // Validation des données
  const validatedData = ProjectUpdateSchema.parse(formData);

  try {
    await prisma.$transaction([
      prisma.project.update({
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
        },
      }),
      // Mise à jour du nom du drapeau si fourni
      ...(validatedData.flagName ? [
        prisma.document.updateMany({
          where: { projectId: validatedData.id, type: "FLAG" },
          data: { name: validatedData.flagName }
        })
      ] : []),
      // Mise à jour du nom du logo client si fourni
      ...(validatedData.clientLogoName ? [
        prisma.document.updateMany({
          where: { projectId: validatedData.id, type: "CLIENT_LOGO" },
          data: { name: validatedData.clientLogoName }
        })
      ] : []),
    ]);

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la mise à jour du projet:", error);
    return { success: false, error: "Erreur lors de la mise à jour en base de données." };
  }
}

export async function createProject(formData: ProjectCreateInput) {
  const session = await auth();

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
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

    revalidatePath("/");

    return { success: true, projectId: project.id };
  } catch (error) {
    console.error("Erreur lors de la création du projet:", error);
    return { success: false, error: "Erreur lors de la création en base de données." };
  }
}

export async function deleteProject(projectId: string, confirmName: string) {
  const session = await auth();

  if (!session || (session.user as { role?: string })?.role !== "ADMIN") {
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

    // Récupérer tous les fichiers associés pour nettoyage Blob
    const files = await prisma.file.findMany({
      where: { projectId },
      select: { blobUrl: true },
    });

    // Supprimer les blobs de Vercel
    if (files.length > 0) {
      await Promise.all(
        files.map((file) =>
          del(file.blobUrl).catch((err) => console.error(`Erreur suppression blob ${file.blobUrl}:`, err))
        )
      );
    }

    // Supprimer le projet (cascade DB gérera les entrées Document, Image, Video, File)
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Erreur lors de la suppression du projet:", error);
    return { success: false, error: "Erreur lors de la suppression." };
  }
}
