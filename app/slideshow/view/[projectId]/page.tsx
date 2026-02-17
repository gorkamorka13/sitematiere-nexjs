import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import SlideshowViewerClient from "@/app/slideshow/view/[projectId]/slideshow-viewer-client";
import { UserRole } from "@/lib/enums";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// export const runtime = 'edge'; // Commenté pour le dev local

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function SlideshowViewPage({ params }: PageProps) {
  const session = await auth();
  const { projectId } = await params;

  if (!session) {
    redirect("/login");
  }

  // Fetch project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch published slideshow images only
  const slideshowImages = await prisma.slideshowImage.findMany({
    where: {
      projectId,
      isPublished: true,
    },
    include: {
      image: {
        select: {
          id: true,
          url: true,
          alt: true,
        },
      },
    },
    orderBy: {
      order: 'asc',
    },
  });

  return (
    <SlideshowViewerClient
      images={slideshowImages}
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
