import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { asc, or, eq, and, ne } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { UserRole } from "@/lib/auth-types";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
  const userId = session.user.id;

  try {
    let query = db
      .select({
        id: projects.id,
        name: projects.name,
        country: projects.country,
        ownerId: projects.ownerId,
        visible: projects.visible,
      })
      .from(projects);

    if (isAdmin) {
      // Admin voit tout
      return NextResponse.json(await query.orderBy(asc(projects.name)));
    } else {
      // Filtrage : Propres projets OU projets visibles (exclure Système par précaution)
      const results = await query
        .where(
          and(
            ne(projects.country, 'Système'),
            or(
              eq(projects.ownerId, userId),
              eq(projects.visible, true)
            )
          )
        )
        .orderBy(asc(projects.name));

      return NextResponse.json(results);
    }
  } catch (error) {
    logger.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
