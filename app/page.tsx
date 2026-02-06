import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button"; // We will create this
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
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return (
    <DashboardClient
      initialProjects={projects}
      user={{ name: session.user?.name, email: session.user?.email }}
    />
  );
}
