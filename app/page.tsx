import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, documents, videos } from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import DashboardClient from "./dashboard-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // 1. Fetch all projects
  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  const projectIds = allProjects.map((p) => p.id);

  // 2. Fetch all documents and videos for all projects in 2 queries instead of 2n
  const allDocuments = projectIds.length > 0
    ? await db.select().from(documents).where(inArray(documents.projectId, projectIds))
    : [];

  const allVideos = projectIds.length > 0
    ? await db.select().from(videos).where(inArray(videos.projectId, projectIds))
    : [];

  // 3. Group everything together in memory
  const projectsWithRelations = allProjects.map((project) => ({
    ...project,
    documents: allDocuments.filter((d) => d.projectId === project.id),
    videos: allVideos.filter((v) => v.projectId === project.id),
  }));

  return (
    <DashboardClient
      initialProjects={projectsWithRelations}
      user={{
        name: session.user?.name,
        username: session.user?.username,
        role: session.user.role,
        color: session.user?.color
      }}
    />
  );
}
