"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { PermissionBadge } from "./permission-badge";
import type { PermissionLevel } from "@/lib/permissions";
import { useLogger } from "@/lib/logger";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  color: string | null;
}

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onAdd: (userId: string, level: PermissionLevel) => Promise<void>;
  existingUserIds: string[];
}

export function PermissionDialog({
  isOpen,
  onClose,
  projectName,
  onAdd,
  existingUserIds,
}: PermissionDialogProps) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<PermissionLevel>("READ");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logger = useLogger("PermissionDialog");

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      logger.error("Erreur lors du chargement des utilisateurs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSelectedUser(null);
      setSelectedLevel("READ");
      setSearch("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredUsers(users.filter((u) => !existingUserIds.includes(u.id)));
    } else {
      const query = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            !existingUserIds.includes(u.id) &&
            (u.name?.toLowerCase().includes(query) ||
              u.username?.toLowerCase().includes(query) ||
              u.email?.toLowerCase().includes(query))
        )
      );
    }
  }, [search, users, existingUserIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      await onAdd(selectedUser.id, selectedLevel);
      onClose();
    } catch (error) {
      logger.error("Erreur lors de l'ajout de la permission:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ajouter une autorisation
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg">
            <span className="text-xs text-gray-500 dark:text-gray-400">Projet</span>
            <p className="font-medium text-gray-900 dark:text-white">{projectName}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
              Utilisateur
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
              />
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-3 text-center">
                    Aucun utilisateur trouvé
                  </p>
                ) : (
                  filteredUsers.slice(0, 5).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                        selectedUser?.id === user.id ? "bg-indigo-50 dark:bg-indigo-900/30" : ""
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: user.color || "#6366f1" }}
                      >
                        {(user.name || user.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name || user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {user.username} • {user.role === "ADMIN" ? "Admin" : user.role === "USER" ? "Utilisateur" : "Visiteur"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedUser && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Niveau de permission
              </label>
              <div className="space-y-2">
                {(["READ", "WRITE", "MANAGE"] as PermissionLevel[]).map((level) => {
                  const isDisabled = selectedUser.role === "VISITOR" && level !== "READ";
                  return (
                    <label
                      key={level}
                      className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : selectedLevel === level
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
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
                      <div className="flex-1">
                        <PermissionBadge level={level} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {level === "READ" && "Consulter le projet et ses médias"}
                          {level === "WRITE" && "Consulter et modifier le projet, ajouter des médias"}
                          {level === "MANAGE" && "Accès complet : modifier, supprimer, gérer les permissions"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {selectedUser.role === "VISITOR" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Les visiteurs ne peuvent avoir que l&apos;accès en lecture.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!selectedUser || isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
