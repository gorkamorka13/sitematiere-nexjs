import { NextResponse } from "next/server";
import { auth, checkRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { logger } from "@/lib/logger";
import type { UserRole } from "@/lib/auth-types";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);

  try {
    const allProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        country: projects.country,
      })
      .from(projects)
      .orderBy(asc(projects.name));

    const filteredProjects = isAdmin
      ? allProjects
      : allProjects.filter(project => project.country !== 'Système');

    return NextResponse.json(filteredProjects);
  } catch (error) {
    logger.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}