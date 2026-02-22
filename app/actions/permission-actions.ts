"use server";

import { db } from "@/lib/db";
import { projectPermissions, projects, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth, checkRole } from "@/lib/auth";
import type { UserRole } from "@/lib/auth-types";
import type { PermissionLevel } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export interface PermissionResult {
  success: boolean;
  error?: string;
  data?: typeof projectPermissions.$inferSelect;
}

export interface PermissionWithUser {
  id: string;
  level: PermissionLevel;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
    color: string | null;
  };
}

export interface PermissionWithProject {
  id: string;
  level: PermissionLevel;
  createdAt: Date;
  project: {
    id: string;
    name: string;
    type: string;
    status: string;
    country: string;
  };
}

export async function grantPermission(
  projectId: string,
  userId: string,
  level: PermissionLevel
): Promise<PermissionResult> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les permissions." };
  }

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: "Projet non trouvé." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, error: "Utilisateur non trouvé." };
    }

    if (user.role === "VISITOR" && level !== "READ") {
      return { success: false, error: "Les visiteurs ne peuvent avoir que l'accès en lecture." };
    }

    const [existingPermission] = await db
      .select()
      .from(projectPermissions)
      .where(
        and(
          eq(projectPermissions.projectId, projectId),
          eq(projectPermissions.userId, userId)
        )
      )
      .limit(1);

    if (existingPermission) {
      const [updated] = await db
        .update(projectPermissions)
        .set({
          level,
          updatedAt: new Date(),
        })
        .where(eq(projectPermissions.id, existingPermission.id))
        .returning();

      revalidatePath("/permissions");
      return { success: true, data: updated };
    }

    const [permission] = await db
      .insert(projectPermissions)
      .values({
        projectId,
        userId,
        level,
        grantedBy: session!.user.id,
      })
      .returning();

    revalidatePath("/permissions");
    return { success: true, data: permission };
  } catch (error) {
    logger.error("Erreur lors de l'octroi de la permission:", error);
    return { success: false, error: "Erreur lors de l'octroi de la permission." };
  }
}

export async function revokePermission(permissionId: string): Promise<PermissionResult> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les permissions." };
  }

  try {
    const [existingPermission] = await db
      .select()
      .from(projectPermissions)
      .where(eq(projectPermissions.id, permissionId))
      .limit(1);

    if (!existingPermission) {
      return { success: false, error: "Permission non trouvée." };
    }

    await db.delete(projectPermissions).where(eq(projectPermissions.id, permissionId));

    revalidatePath("/permissions");
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la révocation de la permission:", error);
    return { success: false, error: "Erreur lors de la révocation de la permission." };
  }
}

export async function updatePermissionLevel(
  permissionId: string,
  newLevel: PermissionLevel
): Promise<PermissionResult> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent gérer les permissions." };
  }

  try {
    const [existingPermission] = await db
      .select({
        id: projectPermissions.id,
        userId: projectPermissions.userId,
      })
      .from(projectPermissions)
      .where(eq(projectPermissions.id, permissionId))
      .limit(1);

    if (!existingPermission) {
      return { success: false, error: "Permission non trouvée." };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingPermission.userId))
      .limit(1);

    if (user && user.role === "VISITOR" && newLevel !== "READ") {
      return { success: false, error: "Les visiteurs ne peuvent avoir que l'accès en lecture." };
    }

    const [permission] = await db
      .update(projectPermissions)
      .set({
        level: newLevel,
        updatedAt: new Date(),
      })
      .where(eq(projectPermissions.id, permissionId))
      .returning();

    revalidatePath("/permissions");
    return { success: true, data: permission };
  } catch (error) {
    logger.error("Erreur lors de la mise à jour de la permission:", error);
    return { success: false, error: "Erreur lors de la mise à jour de la permission." };
  }
}

export async function getProjectPermissionsAction(projectId: string): Promise<PermissionWithUser[]> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return [];
  }

  try {
    const permissions = await db
      .select({
        id: projectPermissions.id,
        level: projectPermissions.level,
        createdAt: projectPermissions.createdAt,
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          role: users.role,
          color: users.color,
        },
      })
      .from(projectPermissions)
      .innerJoin(users, eq(projectPermissions.userId, users.id))
      .where(eq(projectPermissions.projectId, projectId));

    return permissions as PermissionWithUser[];
  } catch (error) {
    logger.error("Erreur lors de la récupération des permissions:", error);
    return [];
  }
}

export async function getUserPermissionsAction(userId: string): Promise<PermissionWithProject[]> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return [];
  }

  try {
    const permissions = await db
      .select({
        id: projectPermissions.id,
        level: projectPermissions.level,
        createdAt: projectPermissions.createdAt,
        project: {
          id: projects.id,
          name: projects.name,
          type: projects.type,
          status: projects.status,
          country: projects.country,
        },
      })
      .from(projectPermissions)
      .innerJoin(projects, eq(projectPermissions.projectId, projects.id))
      .where(eq(projectPermissions.userId, userId));

    return permissions as PermissionWithProject[];
  } catch (error) {
    logger.error("Erreur lors de la récupération des permissions:", error);
    return [];
  }
}

export async function getAllPermissions() {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return [];
  }

  try {
    const permissions = await db
      .select({
        id: projectPermissions.id,
        level: projectPermissions.level,
        createdAt: projectPermissions.createdAt,
        projectId: projectPermissions.projectId,
        userId: projectPermissions.userId,
        project: {
          id: projects.id,
          name: projects.name,
          type: projects.type,
          status: projects.status,
          country: projects.country,
          ownerId: projects.ownerId,
        },
        user: {
          id: users.id,
          name: users.name,
          username: users.username,
          email: users.email,
          role: users.role,
          color: users.color,
        },
      })
      .from(projectPermissions)
      .innerJoin(projects, eq(projectPermissions.projectId, projects.id))
      .innerJoin(users, eq(projectPermissions.userId, users.id));

    return permissions;
  } catch (error) {
    logger.error("Erreur lors de la récupération des permissions:", error);
    return [];
  }
}

export async function changeProjectOwner(projectId: string, newOwnerId: string): Promise<PermissionResult> {
  const session = await auth();

  if (!checkRole(session, ["ADMIN"] as UserRole[])) {
    return { success: false, error: "Action non autorisée. Seuls les administrateurs peuvent changer le propriétaire." };
  }

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return { success: false, error: "Projet non trouvé." };
    }

    const [newOwner] = await db
      .select()
      .from(users)
      .where(eq(users.id, newOwnerId))
      .limit(1);

    if (!newOwner) {
      return { success: false, error: "Utilisateur non trouvé." };
    }

    if (newOwner.role === "VISITOR") {
      return { success: false, error: "Un visiteur ne peut pas être propriétaire d'un projet." };
    }

    await db
      .update(projects)
      .set({
        ownerId: newOwnerId,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    revalidatePath("/permissions");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    logger.error("Erreur lors du changement de propriétaire:", error);
    return { success: false, error: "Erreur lors du changement de propriétaire." };
  }
}
