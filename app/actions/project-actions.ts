"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProjectUpdateSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function updateProject(formData: any) {
  const session = await auth();

  // Vérification de l'authentification et du rôle
  if (!session || (session.user as any)?.role !== "ADMIN") {
    throw new Error("Action non autorisée. Seuls les administrateurs peuvent modifier les projets.");
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
