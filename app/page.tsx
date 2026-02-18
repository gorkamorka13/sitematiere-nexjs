import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, documents, videos } from "@/lib/db/schema";
import type { Project, Document, Video } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import DashboardClient from "./dashboard-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to serialize Date to string for Cloudflare Workers
function serializeDate(date: Date | null | undefined): string {
  return date?.toISOString() || new Date().toISOString();
}

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

      // Serialize Date objects for Cloudflare Workers compatibility
      // Dates are converted to ISO strings to ensure JSON serialization works on Edge Runtime
      const serializedVideos = projectVideos.map(v => ({
        ...v,
        createdAt: serializeDate(v.createdAt),
        updatedAt: serializeDate(v.updatedAt),
      })) as unknown as Video[];

      const serializedDocuments = projectDocuments.map(d => ({
        ...d,
        createdAt: serializeDate(d.createdAt),
      })) as unknown as Document[];

      return {
        ...project,
        createdAt: serializeDate(project.createdAt) as unknown as Date,
        updatedAt: serializeDate(project.updatedAt) as unknown as Date,
        documents: serializedDocuments,
        videos: serializedVideos,
      } as Project;
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