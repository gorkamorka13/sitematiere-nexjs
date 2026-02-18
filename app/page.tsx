import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, documents, videos } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import DashboardClient from "./dashboard-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const allProjects = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  const projectsWithRelations = await Promise.all(
    allProjects.map(async (project) => {
      const [projectDocuments, projectVideos] = await Promise.all([
        db.select().from(documents).where(eq(documents.projectId, project.id)),
        db.select().from(videos).where(eq(videos.projectId, project.id)),
      ]);
      return {
        ...project,
        documents: projectDocuments,
        videos: projectVideos,
      };
    })
  );

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