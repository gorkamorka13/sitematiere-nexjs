import { NextRequest, NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { projectPermissions, projects, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createPermissionSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
  level: z.enum(["READ", "WRITE", "MANAGE"]),
});

const updatePermissionSchema = z.object({
  level: z.enum(["READ", "WRITE", "MANAGE"]),
});

async function checkAdminAccess() {
  const session = await auth();
  return checkRole(session, ["ADMIN"] as UserRole[]);
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");

    if (projectId && userId) {
      const [permission] = await db
        .select()
        .from(projectPermissions)
        .where(
          and(
            eq(projectPermissions.projectId, projectId),
            eq(projectPermissions.userId, userId)
          )
        )
        .limit(1);
      return NextResponse.json(permission || null);
    }

    if (projectId) {
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
        .where(eq(projectPermissions.projectId, projectId))
        .orderBy(desc(projectPermissions.createdAt));
      return NextResponse.json(permissions);
    }

    if (userId) {
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
        .where(eq(projectPermissions.userId, userId))
        .orderBy(desc(projectPermissions.createdAt));
      return NextResponse.json(permissions);
    }

    const allPermissions = await db
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
      .innerJoin(users, eq(projectPermissions.userId, users.id))
      .orderBy(desc(projectPermissions.createdAt));

    return NextResponse.json(allPermissions);
  } catch (error) {
    logger.error("Erreur lors de la récupération des permissions:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createPermissionSchema.parse(body);

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, validatedData.projectId))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Projet non trouvé" },
        { status: 404 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, validatedData.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (user.role === "VISITOR" && validatedData.level !== "READ") {
      return NextResponse.json(
        { error: "Les visiteurs ne peuvent avoir que l'accès en lecture" },
        { status: 400 }
      );
    }

    const [existingPermission] = await db
      .select()
      .from(projectPermissions)
      .where(
        and(
          eq(projectPermissions.projectId, validatedData.projectId),
          eq(projectPermissions.userId, validatedData.userId)
        )
      )
      .limit(1);

    if (existingPermission) {
      return NextResponse.json(
        { error: "Une permission existe déjà pour cet utilisateur sur ce projet" },
        { status: 400 }
      );
    }

    const [permission] = await db
      .insert(projectPermissions)
      .values({
        projectId: validatedData.projectId,
        userId: validatedData.userId,
        level: validatedData.level,
        grantedBy: session!.user.id,
      })
      .returning();

    return NextResponse.json(permission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Erreur lors de la création de la permission:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de la permission requis" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePermissionSchema.parse(body);

    const [existingPermission] = await db
      .select({
        id: projectPermissions.id,
        userId: projectPermissions.userId,
      })
      .from(projectPermissions)
      .where(eq(projectPermissions.id, id))
      .limit(1);

    if (!existingPermission) {
      return NextResponse.json(
        { error: "Permission non trouvée" },
        { status: 404 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingPermission.userId))
      .limit(1);

    if (user && user.role === "VISITOR" && validatedData.level !== "READ") {
      return NextResponse.json(
        { error: "Les visiteurs ne peuvent avoir que l'accès en lecture" },
        { status: 400 }
      );
    }

    const [permission] = await db
      .update(projectPermissions)
      .set({
        level: validatedData.level,
        updatedAt: new Date(),
      })
      .where(eq(projectPermissions.id, id))
      .returning();

    return NextResponse.json(permission);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Erreur lors de la mise à jour de la permission:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de la permission requis" },
        { status: 400 }
      );
    }

    const [existingPermission] = await db
      .select()
      .from(projectPermissions)
      .where(eq(projectPermissions.id, id))
      .limit(1);

    if (!existingPermission) {
      return NextResponse.json(
        { error: "Permission non trouvée" },
        { status: 404 }
      );
    }

    await db.delete(projectPermissions).where(eq(projectPermissions.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erreur lors de la suppression de la permission:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
