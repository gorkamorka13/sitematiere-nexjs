import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// export const runtime = 'edge'; // Commenté pour le dev local

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Vérifier si l'utilisateur est ADMIN
  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

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
    console.error("Failed to fetch projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
