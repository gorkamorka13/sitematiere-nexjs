import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ImageProcessorClient from "./image-processor-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ImageProcessorPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
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
    <ImageProcessorClient
      initialProjects={projects as any}
      user={{
        name: session.user?.name,
        username: (session.user as any)?.username,
        role: (session.user as any)?.role,
        color: (session.user as any)?.color
      }}
    />
  );
}
