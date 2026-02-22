"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { PermissionBadge } from "./permission-badge";
import type { PermissionLevel } from "@/lib/permissions";
import { grantPermission, revokePermission } from "@/app/actions/permission-actions";
import { useLogger } from "@/lib/logger";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
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
  };
}

interface Permission {
  id: string;
  level: PermissionLevel;
  projectId: string;
  userId: string;
  project: Project;
  user: User;
}

interface ByUserTabProps {
  users: User[];
  projects: Project[];
  permissions: Permission[];
}

export function ByUserTab({ users, projects, permissions }: ByUserTabProps) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [permissionsMap, setPermissionsMap] = useState<Map<string, Permission[]>>(() => {
    const map = new Map<string, Permission[]>();
    permissions.forEach((p) => {
      const existing = map.get(p.userId) || [];
      map.set(p.userId, [...existing, p]);
    });
    return map;
  });
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogUser, setDialogUser] = useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<PermissionLevel>("READ");
  const router = useRouter();
  const logger = useLogger("ByUserTab");

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const toggleUser = async (userId: string) => {
    const newExpanded = new Set(expandedUsers);

    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
      setExpandedUsers(newExpanded);
    } else {
      newExpanded.add(userId);
      setExpandedUsers(newExpanded);

      if (!permissionsMap.has(userId)) {
        await fetchUserPermissions(userId);
      }
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      setLoadingUsers((prev) => new Set(prev).add(userId));
      const response = await fetch(`/api/permissions?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPermissionsMap((prev) => new Map(prev).set(userId, data));
      }
    } catch (error) {
      logger.error("Erreur lors du chargement des permissions:", error);
    } finally {
      setLoadingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleAddPermission = async () => {
    if (!dialogUser || !selectedProjectId) return;

    const result = await grantPermission(selectedProjectId, dialogUser.id, selectedLevel);
    if (result.success) {
      await fetchUserPermissions(dialogUser.id);
      setDialogUser(null);
      setSelectedProjectId("");
      setSelectedLevel("READ");
      router.refresh();
    } else {
      alert(result.error || "Erreur lors de l'ajout de la permission");
    }
  };

  const handleDeletePermission = async (permissionId: string, userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette autorisation ?")) return;

    const result = await revokePermission(permissionId);
    if (result.success) {
      const permissions = permissionsMap.get(userId);
      if (permissions) {
        const updatedPermissions = permissions.filter((p) => p.id !== permissionId);
        setPermissionsMap((prev) => new Map(prev).set(userId, updatedPermissions));
      }
      router.refresh();
    } else {
      alert(result.error || "Erreur lors de la suppression");
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrateur";
      case "USER":
        return "Utilisateur";
      case "VISITOR":
        return "Visiteur";
      default:
        return role;
    }
  };

  const existingProjectIds = dialogUser
    ? (permissionsMap.get(dialogUser.id) || []).map((p) => p.project.id)
    : [];

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
        />
      </div>

      <div className="space-y-2">
        {filteredUsers.map((user) => {
          const isExpanded = expandedUsers.has(user.id);
          const permissions = permissionsMap.get(user.id) || [];
          const isLoading = loadingUsers.has(user.id);

          return (
            <div
              key={user.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => toggleUser(user.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: user.color || "#6366f1" }}
                  >
                    {(user.name || user.username || "?")[0].toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {user.name || user.username}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{user.username} • {getRoleLabel(user.role)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {permissions.length} projet{permissions.length !== 1 ? "s" : ""}
                  </span>
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
                      {permissions.length > 0 ? (
                        <div className="space-y-2 mb-4">
                          {permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {permission.project.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {permission.project.country} • {permission.project.type}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <PermissionBadge level={permission.level} />
                                <button
                                  onClick={() => handleDeletePermission(permission.id, user.id)}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          Aucun projet accessible
                        </p>
                      )}
                      <button
                        onClick={() => setDialogUser(user)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter un projet
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dialogUser && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDialogUser(null)} />

          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ajouter un projet à {dialogUser.name || dialogUser.username}
              </h2>
              <button onClick={() => setDialogUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Projet
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
                >
                  <option value="">Sélectionner un projet</option>
                  {projects
                    .filter((p) => !existingProjectIds.includes(p.id))
                    .map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.country})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Niveau de permission
                </label>
                <div className="space-y-2">
                  {(["READ", "WRITE", "MANAGE"] as PermissionLevel[]).map((level) => {
                    const isDisabled = dialogUser.role === "VISITOR" && level !== "READ";
                    return (
                      <label
                        key={level}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                          isDisabled
                            ? "opacity-50 cursor-not-allowed"
                            : selectedLevel === level
                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="level"
                          value={level}
                          checked={selectedLevel === level}
                          onChange={() => !isDisabled && setSelectedLevel(level)}
                          disabled={isDisabled}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <PermissionBadge level={level} />
                      </label>
                    );
                  })}
                </div>
                {dialogUser.role === "VISITOR" && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Les visiteurs ne peuvent avoir que l&apos;accès en lecture.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setDialogUser(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleAddPermission}
                  disabled={!selectedProjectId}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
