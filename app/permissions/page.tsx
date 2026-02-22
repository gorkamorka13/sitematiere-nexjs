import { auth, checkRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { desc, eq, ne } from "drizzle-orm";
import { PermissionTabs } from "@/components/permissions/permission-tabs";
import type { UserRole } from "@/lib/auth-types";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PermissionsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = checkRole(session, ["ADMIN"] as UserRole[]);

  if (!isAdmin) {
    redirect("/");
  }

  const [allProjects, allUsers, allPermissions] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        type: projects.type,
        status: projects.status,
        country: projects.country,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(ne(projects.country, "Système"))
      .orderBy(desc(projects.createdAt)),

    db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
        color: users.color,
      })
      .from(users)
      .orderBy(desc(users.createdAt)),

    db.query.projectPermissions.findMany({
      with: {
        project: true,
        user: true,
      },
    }),
  ]);

  const projectsWithOwners = await Promise.all(
    allProjects.map(async (project) => {
      const [owner] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          color: users.color,
        })
        .from(users)
        .where(eq(users.id, project.ownerId))
        .limit(1);

      return {
        ...project,
        owner: owner || null,
      };
    })
  );

  const permissions = allPermissions.map((p) => ({
    id: p.id,
    level: p.level as "READ" | "WRITE" | "MANAGE",
    projectId: p.projectId,
    userId: p.userId,
    project: {
      id: p.project.id,
      name: p.project.name,
      type: p.project.type,
      status: p.project.status,
      country: p.project.country,
      ownerId: p.project.ownerId,
    },
    user: {
      id: p.user.id,
      name: p.user.name,
      username: p.user.username,
      email: p.user.email,
      role: p.user.role,
      color: p.user.color,
    },
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Retour au Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des autorisations
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gérez les accès aux projets pour chaque utilisateur
          </p>
        </div>

        <PermissionTabs
          projects={projectsWithOwners}
          users={allUsers}
          permissions={permissions}
        />
      </div>
    </div>
  );
}
