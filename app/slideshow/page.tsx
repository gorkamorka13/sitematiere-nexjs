import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SlideshowManagerClient from "@/app/slideshow/slideshow-manager-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SlideshowPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Check if user is ADMIN
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    redirect("/");
  }

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <SlideshowManagerClient
      initialProjects={projects}
      user={{
        name: session.user?.name,
        username: (session.user as any)?.username,
        role: (session.user as any)?.role,
        color: (session.user as any)?.color
      }}
    />
  );
}
