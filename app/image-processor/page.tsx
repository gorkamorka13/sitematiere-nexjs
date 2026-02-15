import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ImageProcessorClient from "./image-processor-client";

import { UserRole } from "@/lib/enums";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// export const runtime = 'edge'; // Commenté pour le dev local

export default async function ImageProcessorPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <ImageProcessorClient
      initialProjects={projects}
      user={{
        name: session.user?.name,
        username: session.user?.username,
        role: session.user?.role as unknown as UserRole,
        color: session.user?.color
      }}
    />
  );
}
