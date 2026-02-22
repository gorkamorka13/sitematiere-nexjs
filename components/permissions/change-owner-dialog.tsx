"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Crown } from "lucide-react";
import { useLogger } from "@/lib/logger";

interface User {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
  color: string | null;
}

interface ChangeOwnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  currentOwnerId: string;
  onOwnerChange: (newOwnerId: string) => Promise<void>;
}

export function ChangeOwnerDialog({
  isOpen,
  onClose,
  projectName,
  currentOwnerId,
  onOwnerChange,
}: ChangeOwnerDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const logger = useLogger("ChangeOwnerDialog");

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSearch("");
      setSelectedUserId("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredUsers(users.filter((u) => u.role !== "VISITOR"));
    } else {
      const query = search.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.role !== "VISITOR" &&
            (u.name?.toLowerCase().includes(query) ||
              u.username?.toLowerCase().includes(query) ||
              u.email?.toLowerCase().includes(query))
        )
      );
    }
  }, [search, users]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || selectedUserId === currentOwnerId) return;

    try {
      setIsSubmitting(true);
      await onOwnerChange(selectedUserId);
      onClose();
    } catch (error) {
      logger.error("Erreur lors du changement de propriétaire:", error);
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Changer le propriétaire
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
              Nouveau propriétaire
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm mb-2"
            />
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-3 text-center">
                    Aucun utilisateur trouvé
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3 ${
                        selectedUserId === user.id ? "bg-indigo-50 dark:bg-indigo-900/30" : ""
                      } ${user.id === currentOwnerId ? "opacity-50" : ""}`}
                      disabled={user.id === currentOwnerId}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                        style={{ backgroundColor: user.color || "#6366f1" }}
                      >
                        {(user.name || user.username || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {user.name || user.username}
                          {user.id === currentOwnerId && (
                            <span className="ml-2 text-xs text-gray-400">(actuel)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          @{user.username} • {user.role === "ADMIN" ? "Admin" : "Utilisateur"}
                        </p>
                      </div>
                      {user.id === currentOwnerId && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Le propriétaire a un accès complet au projet (lecture, écriture, suppression) et peut gérer les permissions.
            </p>
          </div>

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
              disabled={!selectedUserId || selectedUserId === currentOwnerId || isSubmitting}
              className="px-6 py-2 text-sm font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? "Enregistrement..." : "Changer le propriétaire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
