"use client";

import { useState, useMemo } from "react";
import { Crown, Edit2, Search } from "lucide-react";
import { ChangeOwnerDialog } from "./change-owner-dialog";
import { changeProjectOwner } from "@/app/actions/permission-actions";
import { useRouter } from "next/navigation";

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

interface ResponsibilitiesTabProps {
  projects: Project[];
  users: User[];
}

export function ResponsibilitiesTab({ projects, users }: ResponsibilitiesTabProps) {
  const [searchProject, setSearchProject] = useState("");
  const [searchOwner, setSearchOwner] = useState("");
  const [ownerDialogProject, setOwnerDialogProject] = useState<Project | null>(null);
  const [projectOwners, setProjectOwners] = useState<Map<string, Project["owner"]>>(() => {
    const map = new Map<string, Project["owner"]>();
    projects.forEach((p) => map.set(p.id, p.owner));
    return map;
  });
  const router = useRouter();

  const ownerStats = useMemo(() => {
    const stats = new Map<string, { name: string; color: string; count: number }>();
    projects.forEach((project) => {
      const owner = projectOwners.get(project.id) || project.owner;
      if (owner) {
        const key = owner.id;
        const current = stats.get(key) || { name: owner.name || owner.username || "Inconnu", color: owner.color || "#6366f1", count: 0 };
        stats.set(key, { ...current, count: current.count + 1 });
      }
    });
    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [projects, projectOwners]);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const owner = projectOwners.get(project.id) || project.owner;
      const matchesProject = !searchProject || project.name.toLowerCase().includes(searchProject.toLowerCase());
      const matchesOwner = !searchOwner || (owner && (owner.name?.toLowerCase().includes(searchOwner.toLowerCase()) || owner.username?.toLowerCase().includes(searchOwner.toLowerCase())));
      return matchesProject && matchesOwner;
    });
  }, [projects, projectOwners, searchProject, searchOwner]);

  const handleOwnerChange = async (newOwnerId: string) => {
    if (!ownerDialogProject) return;

    const result = await changeProjectOwner(ownerDialogProject.id, newOwnerId);

    if (result.success) {
      const newUser = users.find((u) => u.id === newOwnerId);
      if (newUser) {
        setProjectOwners((prev) =>
          new Map(prev).set(ownerDialogProject.id, {
            id: newUser.id,
            name: newUser.name,
            username: newUser.username,
            color: newUser.color,
          })
        );
      }
      router.refresh();
    } else {
      alert(result.error || "Erreur lors du changement de propriétaire");
    }
  };

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Répartition des projets par propriétaire
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {ownerStats.map((stat, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium mx-auto mb-2"
                style={{ backgroundColor: stat.color }}
              >
                {stat.name[0].toUpperCase()}
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{stat.name}</p>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{stat.count}</p>
              <p className="text-xs text-gray-500">projet{stat.count !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchProject}
            onChange={(e) => setSearchProject(e.target.value)}
            placeholder="Rechercher un projet..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
          />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchOwner}
            onChange={(e) => setSearchOwner(e.target.value)}
            placeholder="Filtrer par propriétaire..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
          />
        </div>
      </div>

      {/* Liste des projets */}
      <div className="space-y-2">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Aucun projet trouvé</div>
        ) : (
          filteredProjects.map((project) => {
            const owner = projectOwners.get(project.id) || project.owner;
            const statusColors: Record<string, string> = {
              DONE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
              CURRENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
              PROSPECT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            };
            const statusLabels: Record<string, string> = { DONE: "Réalisé", CURRENT: "En cours", PROSPECT: "Prospect" };

            return (
              <div
                key={project.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">{project.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[project.status] || ""}`}>
                      {statusLabels[project.status] || project.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{project.country} • {project.type}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Crown className="w-4 h-4 text-amber-500" />
                    {owner && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: owner.color || "#6366f1" }}
                      >
                        {(owner.name || owner.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {owner?.name || owner?.username || "Non assigné"}
                    </span>
                  </div>
                  <button
                    onClick={() => setOwnerDialogProject(project)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    title="Changer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {ownerDialogProject && (
        <ChangeOwnerDialog
          isOpen={true}
          onClose={() => setOwnerDialogProject(null)}
          projectName={ownerDialogProject.name}
          currentOwnerId={ownerDialogProject.ownerId}
          onOwnerChange={handleOwnerChange}
        />
      )}
    </div>
  );
}
