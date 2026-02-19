import { auth, checkRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, documents, videos, users } from "@/lib/db/schema";
import { desc, inArray, or, eq, and, ne } from "drizzle-orm";
import DashboardClient from "./dashboard-client";
import type { UserRole } from "@/lib/auth-types";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);
  const userId = session.user.id;

  // 1. Fetch filtered projects with owner info
  let allProjects;
  try {
    const projectQuery = db
      .select({
        project: projects,
        owner: {
          username: users.username,
          color: users.color,
        }
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id));

    if (isAdmin) {
      allProjects = await projectQuery.orderBy(desc(projects.createdAt));
    } else {
      allProjects = await projectQuery
        .where(
          and(
            ne(projects.country, "Système"),
            or(
              eq(projects.ownerId, userId),
              eq(projects.visible, true)
            )
          )
        )
        .orderBy(desc(projects.createdAt));
    }
  } catch (error) {
    console.error("[DashboardPage] Details of project query failure:", error);
    throw error;
  }

  const projectIds = allProjects.map((p) => p.project.id);

  // 2. Fetch all documents and videos for all projects in 2 additional queries (Total 3 queries)
  const [allDocuments, allVideos] = await Promise.all([
    projectIds.length > 0
      ? db.select().from(documents).where(inArray(documents.projectId, projectIds))
      : [],
    projectIds.length > 0
      ? db.select().from(videos).where(inArray(videos.projectId, projectIds))
      : []
  ]);

  // 3. Group everything together in memory
  const projectsWithRelations = allProjects.map((row) => ({
    ...row.project,
    owner: row.owner,
    documents: allDocuments.filter((d) => d.projectId === row.project.id),
    videos: allVideos.filter((v) => v.projectId === row.project.id),
  }));

  return (
    <DashboardClient
      initialProjects={projectsWithRelations}
      user={{
        id: session.user?.id,
        name: session.user?.name,
        username: session.user?.username,
        role: session.user.role,
        color: session.user?.color
      }}
    />
  );
}
