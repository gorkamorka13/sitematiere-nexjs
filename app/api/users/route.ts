import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { hash } from "bcrypt-ts";
import { z } from "zod";
import { UserRole } from "@prisma/client";

export const runtime = 'edge';

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
  name: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "USER", "VISITOR"]).optional(),
  color: z.string().optional(),
});

async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return false;
  }
  return true;
}

// GET /api/users - Liste tous les utilisateurs (admin uniquement)
export async function GET() {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/users - Crée un nouvel utilisateur (admin uniquement)
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = userSchema.parse(body);

    // Vérifier si le username existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec ce nom de connexion existe déjà" },
        { status: 400 }
      );
    }

    // Hasher le mot de passe
    const passwordHash = await hash(validatedData.password, 10);

    const user = await prisma.user.create({
      data: {
        username: validatedData.username,
        name: validatedData.name,
        passwordHash,
        role: validatedData.role as UserRole,
        color: validatedData.color || "#6366f1",
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la création de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// PUT /api/users - Met à jour un utilisateur (admin uniquement)
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    const { id, ...updateData } = validatedData;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Préparer les données de mise à jour
    const dataToUpdate: { username?: string; name?: string; role?: UserRole; passwordHash?: string; color?: string } = {};
    if (updateData.username) dataToUpdate.username = updateData.username;
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.role) dataToUpdate.role = updateData.role;
    if (updateData.color) dataToUpdate.color = updateData.color;
    if (updateData.password) {
      dataToUpdate.passwordHash = await hash(updateData.password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Supprime un utilisateur (admin uniquement)
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

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Empêcher la suppression de son propre compte
    const session = await auth();
    if ((session?.user as { id?: string })?.id === id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
