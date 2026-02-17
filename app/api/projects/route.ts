import { NextResponse } from "next/server";
import { auth, checkRole, UserRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";


export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier si l'utilisateur est ADMIN
  const isAdmin = checkRole(session, [UserRole.ADMIN]);

  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        name: true,
        country: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Filtrer les projets système pour les non-administrateurs
    const filteredProjects = isAdmin
      ? projects
      : projects.filter(project => project.country !== 'Système');

    return NextResponse.json(filteredProjects);
  } catch (error) {
    logger.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
