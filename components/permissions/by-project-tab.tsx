"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, Loader2, Crown } from "lucide-react";
import { PermissionBadge } from "./permission-badge";
import { PermissionDialog } from "./permission-dialog";
import { ChangeOwnerDialog } from "./change-owner-dialog";
import type { PermissionLevel } from "@/lib/permissions";
import { grantPermission, revokePermission, updatePermissionLevel, changeProjectOwner } from "@/app/actions/permission-actions";
import { useLogger } from "@/lib/logger";
import { useRouter } from "next/navigation";

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
  };
}

interface Permission {
  id: string;
  level: PermissionLevel;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    role: string;
    color: string | null;
  };
}

interface ByProjectTabProps {
  projects: Project[];
  onOwnerChange?: (projectId: string, newOwnerId: string) => void;
}

export function ByProjectTab({ projects, onOwnerChange }: ByProjectTabProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [permissionsMap, setPermissionsMap] = useState<Map<string, Permission[]>>(new Map());
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(new Set());
  const [dialogProject, setDialogProject] = useState<Project | null>(null);
  const [ownerDialogProject, setOwnerDialogProject] = useState<Project | null>(null);
  const [editingPermission, setEditingPermission] = useState<{ id: string; level: PermissionLevel } | null>(null);
  const [projectOwners, setProjectOwners] = useState<Map<string, Project["owner"]>>(new Map());
  const router = useRouter();
  const logger = useLogger("ByProjectTab");

  useState(() => {
    const owners = new Map<string, Project["owner"]>();
    projects.forEach((p) => owners.set(p.id, p.owner));
    setProjectOwners(owners);
  });

  const toggleProject = async (projectId: string) => {
    const newExpanded = new Set(expandedProjects);

    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
      setExpandedProjects(newExpanded);
    } else {
      newExpanded.add(projectId);
      setExpandedProjects(newExpanded);

      if (!permissionsMap.has(projectId)) {
        await fetchProjectPermissions(projectId);
      }
    }
  };

  const fetchProjectPermissions = async (projectId: string) => {
    try {
      setLoadingProjects((prev) => new Set(prev).add(projectId));
      const response = await fetch(`/api/permissions?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissionsMap((prev) => new Map(prev).set(projectId, data));
      }
    } catch (error) {
      logger.error("Erreur lors du chargement des permissions:", error);
    } finally {
      setLoadingProjects((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const handleAddPermission = async (userId: string, level: PermissionLevel) => {
    if (!dialogProject) return;

    const result = await grantPermission(dialogProject.id, userId, level);
    if (result.success) {
      await fetchProjectPermissions(dialogProject.id);
      router.refresh();
    } else {
      alert(result.error || "Erreur lors de l'ajout de la permission");
    }
  };

  const handleUpdateLevel = async (permissionId: string, newLevel: PermissionLevel) => {
    const result = await updatePermissionLevel(permissionId, newLevel);
    if (result.success) {
      setEditingPermission(null);
      const permissions = permissionsMap.get(dialogProject?.id || "");
      if (permissions) {
        const updatedPermissions = permissions.map((p) =>
          p.id === permissionId ? { ...p, level: newLevel } : p
        );
        setPermissionsMap((prev) => new Map(prev).set(dialogProject?.id || "", updatedPermissions));
      }
      router.refresh();
    } else {
      alert(result.error || "Erreur lors de la mise à jour");
    }
  };

  const handleDeletePermission = async (permissionId: string, projectId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette autorisation ?")) return;

    const result = await revokePermission(permissionId);
    if (result.success) {
      const permissions = permissionsMap.get(projectId);
      if (permissions) {
        const updatedPermissions = permissions.filter((p) => p.id !== permissionId);
        setPermissionsMap((prev) => new Map(prev).set(projectId, updatedPermissions));
      }
      router.refresh();
    } else {
      alert(result.error || "Erreur lors de la suppression");
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    if (!ownerDialogProject) return;

    const result = await changeProjectOwner(ownerDialogProject.id, newOwnerId);

    if (result.success) {
      const response = await fetch(`/api/users/${newOwnerId}`);
      if (response.ok) {
        const newUser = await response.json();
        setProjectOwners((prev) => new Map(prev).set(ownerDialogProject.id, newUser));
      }
      onOwnerChange?.(ownerDialogProject.id, newOwnerId);
      router.refresh();
    } else {
      alert(result.error || "Erreur lors du changement de propriétaire");
    }
  };

  const getProjectOwner = (project: Project) => {
    return projectOwners.get(project.id) || project.owner;
  };

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const isExpanded = expandedProjects.has(project.id);
        const permissions = permissionsMap.get(project.id) || [];
        const isLoading = loadingProjects.has(project.id);
        const owner = getProjectOwner(project);

        return (
          <div
            key={project.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleProject(project.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {project.country} • {project.type} • {project.status === "DONE" ? "Réalisé" : project.status === "CURRENT" ? "En cours" : "Prospect"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {owner && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: owner.color || "#6366f1" }}
                    >
                      {(owner.name || owner.username || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                      {owner.name || owner.username}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{permissions.length}</span>
                  <span className="hidden sm:inline">membre{permissions.length !== 1 ? "s" : ""}</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    {/* Section Propriétaire */}
                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Crown className="w-5 h-5 text-amber-500" />
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-widest">
                            Propriétaire
                          </span>
                        </div>
                        <button
                          onClick={() => setOwnerDialogProject(project)}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                        >
                          {owner && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: owner.color || "#6366f1" }}
                            >
                              {(owner.name || owner.username || "?")[0].toUpperCase()}
                            </div>
                          )}
                          <span>{owner?.name || owner?.username || "Non défini"}</span>
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Section Membres autorisés */}
                    <div className="mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Membres autorisés ({permissions.length})
                      </span>
                    </div>

                    {permissions.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                style={{ backgroundColor: permission.user.color || "#6366f1" }}
                              >
                                {(permission.user.name || permission.user.username || "?")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {permission.user.name || permission.user.username}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {permission.user.role === "ADMIN"
                                    ? "Admin"
                                    : permission.user.role === "USER"
                                    ? "Utilisateur"
                                    : "Visiteur"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {editingPermission?.id === permission.id ? (
                                <select
                                  value={editingPermission.level}
                                  onChange={(e) =>
                                    handleUpdateLevel(permission.id, e.target.value as PermissionLevel)
                                  }
                                  className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 dark:bg-gray-700"
                                  autoFocus
                                >
                                  {(["READ", "WRITE", "MANAGE"] as PermissionLevel[]).map((level) => (
                                    <option
                                      key={level}
                                      value={level}
                                      disabled={permission.user.role === "VISITOR" && level !== "READ"}
                                    >
                                      {level === "READ" ? "Lecture" : level === "WRITE" ? "Écriture" : "Gestion"}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <PermissionBadge level={permission.level} />
                              )}
                              <button
                                onClick={() =>
                                  setEditingPermission({ id: permission.id, level: permission.level })
                                }
                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                title="Modifier"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePermission(permission.id, project.id)}
                                className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4 mb-4">
                        Aucune autorisation accordée
                      </p>
                    )}
                    <button
                      onClick={() => setDialogProject(project)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une autorisation
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {dialogProject && (
        <PermissionDialog
          isOpen={true}
          onClose={() => setDialogProject(null)}
          projectName={dialogProject.name}
          onAdd={handleAddPermission}
          existingUserIds={(permissionsMap.get(dialogProject.id) || []).map((p) => p.user.id)}
        />
      )}

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
