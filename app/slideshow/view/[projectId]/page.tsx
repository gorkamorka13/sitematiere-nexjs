import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { projects, slideshowImages, images } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import SlideshowViewerClient from "@/app/slideshow/view/[projectId]/slideshow-viewer-client";
import type { UserRole } from "@/lib/auth-types";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SlideshowViewPage({ params }: PageProps) {
  const session = await auth();
  const { projectId } = await params;

  if (!session) {
    redirect("/login");
  }

  const projectRecords = await db.select({
    id: projects.id,
    name: projects.name,
  })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const project = projectRecords[0];

  if (!project) {
    notFound();
  }

  const slideshowImageRecords = await db.select({
    id: slideshowImages.id,
    projectId: slideshowImages.projectId,
    imageId: slideshowImages.imageId,
    order: slideshowImages.order,
    isPublished: slideshowImages.isPublished,
    createdAt: slideshowImages.createdAt,
    updatedAt: slideshowImages.updatedAt,
    image: {
      id: images.id,
      url: images.url,
      alt: images.alt,
    },
  })
    .from(slideshowImages)
    .innerJoin(images, eq(slideshowImages.imageId, images.id))
    .where(and(
      eq(slideshowImages.projectId, projectId),
      eq(slideshowImages.isPublished, true)
    ))
    .orderBy(asc(slideshowImages.order));

  return (
    <SlideshowViewerClient
      images={slideshowImageRecords}
      projectName={project.name}
      user={{
        name: session.user?.name,
        username: session.user?.username,
        role: session.user?.role as unknown as UserRole,
        color: session.user?.color
      }}
    />
  );
}