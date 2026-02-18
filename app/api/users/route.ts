import { NextRequest, NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { hash } from "bcrypt-ts";
import { z } from "zod";
import { logger } from "@/lib/logger";

const userSchema = z.object({
  username: z.string().min(1),
  name: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "USER", "VISITOR"]),
  color: z.string().optional(),
});

const updateUserSchema = z.object({
  id: z.string(),
  username: z.string().min(1).optional(),
  name: z.string().optional().nullable(),
  password: z.string().min(6).or(z.literal("")).optional(),
  role: z.enum(["ADMIN", "USER", "VISITOR"]).optional(),
  color: z.string().optional().nullable(),
});

async function checkAdminAccess() {
  const session = await auth();
  return checkRole(session, ["ADMIN"] as UserRole[]);
}

export async function GET() {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        color: users.color,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(allUsers);
  } catch (error) {
    logger.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = userSchema.parse(body);

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, validatedData.username))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec ce nom de connexion existe déjà" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(validatedData.password, 10);

    const [user] = await db
      .insert(users)
      .values({
        username: validatedData.username,
        name: validatedData.name,
        passwordHash,
        role: validatedData.role as UserRole,
        color: validatedData.color || "#6366f1",
      })
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        color: users.color,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Erreur lors de la création de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const { id, ...updateData } = validatedData;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (updateData.username && updateData.username !== existingUser.username) {
      const [usernameTaken] = await db
        .select()
        .from(users)
        .where(eq(users.username, updateData.username))
        .limit(1);
      if (usernameTaken) {
        return NextResponse.json(
          { error: "Ce nom de connexion est déjà utilisé par un autre utilisateur" },
          { status: 400 }
        );
      }
    }

    const dataToUpdate: {
      username?: string;
      name?: string | null;
      role?: UserRole;
      color?: string | null;
      passwordHash?: string;
    } = {};
    if (updateData.username) dataToUpdate.username = updateData.username;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.role) dataToUpdate.role = updateData.role as UserRole;
    if (updateData.color !== undefined) dataToUpdate.color = updateData.color;

    if (updateData.password && updateData.password.trim().length >= 6) {
      dataToUpdate.passwordHash = await hash(updateData.password, 10);
    }

    const [user] = await db
      .update(users)
      .set(dataToUpdate)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        color: users.color,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    logger.error("Erreur lors de la mise à jour de l'utilisateur:", error);
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
        { error: "ID de l'utilisateur requis" },
        { status: 400 }
      );
    }

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    if (existingUser.username === "admin") {
      return NextResponse.json(
        { error: "Le compte administrateur principal ne peut pas être supprimé" },
        { status: 400 }
      );
    }

    const session = await auth();
    if (session?.user?.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erreur lors de la suppression de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}