import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const projects = await prisma.project.findMany({
    include: {
      images: true,
      documents: true,
      videos: true,
      files: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <DashboardClient
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
