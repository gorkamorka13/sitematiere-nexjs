"use client";

import { useState, useMemo } from "react";
import { PermissionBadge } from "./permission-badge";
import type { PermissionLevel } from "@/lib/permissions";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  role: string;
  color: string | null;
}

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  country: string;
  ownerId: string;
  owner?: {
    id: string;
    name: string | null;
    username: string | null;
    color: string | null;
  } | null;
}

interface Permission {
  id: string;
  level: PermissionLevel;
  projectId: string;
  userId: string;
  project: Project;
  user: User;
}

interface MatrixTabProps {
  users: User[];
  projects: Project[];
  permissions: Permission[];
}

export function MatrixTab({ users, projects, permissions }: MatrixTabProps) {
  const [searchUser, setSearchUser] = useState("");
  const [searchProject, setSearchProject] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchUser) return users.filter((u) => u.role !== "ADMIN");
    const query = searchUser.toLowerCase();
    return users.filter(
      (u) =>
        u.role !== "ADMIN" &&
        (u.name?.toLowerCase().includes(query) || u.username?.toLowerCase().includes(query))
    );
  }, [users, searchUser]);

  const filteredProjects = useMemo(() => {
    if (!searchProject) return projects;
    const query = searchProject.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.country.toLowerCase().includes(query) ||
        p.type.toLowerCase().includes(query)
    );
  }, [projects, searchProject]);

  const getPermissionLevel = (userId: string, projectId: string): PermissionLevel | "OWNER" | null => {
    const project = projects.find((p) => p.id === projectId);
    if (project?.ownerId === userId) return "OWNER";

    const permission = permissions.find((p) => p.userId === userId && p.projectId === projectId);
    return permission?.level || null;
  };

  const getCellContent = (userId: string, projectId: string) => {
    const level = getPermissionLevel(userId, projectId);

    if (!level) {
      return <span className="text-gray-300 dark:text-gray-600">—</span>;
    }

    return <PermissionBadge level={level} />;
  };

  if (filteredUsers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Aucun utilisateur à afficher (les administrateurs ont accès à tous les projets)
      </div>
    );
  }

  if (filteredProjects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Aucun projet trouvé
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          value={searchUser}
          onChange={(e) => setSearchUser(e.target.value)}
          placeholder="Filtrer utilisateurs..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        />
        <input
          type="text"
          value={searchProject}
          onChange={(e) => setSearchProject(e.target.value)}
          placeholder="Filtrer projets..."
          className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-white dark:bg-gray-800 px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 min-w-[150px]">
                Utilisateur
              </th>
              {filteredProjects.slice(0, 10).map((project) => (
                <th
                  key={project.id}
                  className="px-3 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700 min-w-[100px]"
                >
                  <div className="truncate max-w-[120px]" title={project.name}>
                    {project.name}
                  </div>
                  {project.owner && (
                    <div className="flex items-center gap-1 mt-1">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-medium"
                        style={{ backgroundColor: project.owner.color || "#6366f1" }}
                      >
                        {(project.owner.name || project.owner.username || "?")[0].toUpperCase()}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate max-w-[80px]">
                        {project.owner.name || project.owner.username}
                      </span>
                    </div>
                  )}
                </th>
              ))}
              {filteredProjects.length > 10 && (
                <th className="px-3 py-3 text-left text-xs text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  +{filteredProjects.length - 10} autres
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                      style={{ backgroundColor: user.color || "#6366f1" }}
                    >
                      {(user.name || user.username || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name || user.username}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.role === "USER" ? "Utilisateur" : "Visiteur"}
                      </p>
                    </div>
                  </div>
                </td>
                {filteredProjects.slice(0, 10).map((project) => (
                  <td
                    key={project.id}
                    className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 text-center"
                  >
                    {getCellContent(user.id, project.id)}
                  </td>
                ))}
                {filteredProjects.length > 10 && (
                  <td className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 text-center text-gray-400 text-xs">
                    ...
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
        <span className="font-medium">Légende:</span>
        <div className="flex items-center gap-2">
          <PermissionBadge level="OWNER" />
          <span>Propriétaire</span>
        </div>
        <div className="flex items-center gap-2">
          <PermissionBadge level="READ" />
          <span>Lecture</span>
        </div>
        <div className="flex items-center gap-2">
          <PermissionBadge level="WRITE" />
          <span>Écriture</span>
        </div>
        <div className="flex items-center gap-2">
          <PermissionBadge level="MANAGE" />
          <span>Gestion</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-300">—</span>
          <span>Pas d&apos;accès</span>
        </div>
      </div>
    </div>
  );
}
