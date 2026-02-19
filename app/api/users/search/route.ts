import { NextRequest, NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike, or } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { UserRole } from "@/lib/auth-types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    // Restriction aux administrateurs
    if (!checkRole(session, ["ADMIN"] as UserRole[])) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const matchedUsers = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        color: users.color,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.name, `%${query}%`)
        )
      )
      .limit(10);

    return NextResponse.json(matchedUsers);
  } catch (error) {
    logger.error("Erreur lors de la recherche d'utilisateurs:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
