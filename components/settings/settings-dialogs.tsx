"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, X, UserCircle, Shield, Eye, EyeOff, Save, Trash2, Edit2, Plus, Palette, ChevronLeft, Database } from "lucide-react";
import { UserRole } from "@/lib/auth-types";
import UserBadge from "./user-badge";
import { useLogger } from "@/lib/logger";

interface User {
  id: string;
  username: string | null;
  name: string | null;
  role: UserRole;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SettingsDialogsProps {
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// Couleurs prédéfinies pour le color picker
const predefinedColors = [
  "#ef4444", // rouge
  "#f97316", // orange
  "#f59e0b", // jaune
  "#84cc16", // vert lime
  "#22c55e", // vert
  "#10b981", // émeraude
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // bleu clair
  "#3b82f6", // bleu
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // violet clair
  "#d946ef", // fuchsia
  "#ec4899", // rose
];

export default function SettingsDialogs({ isAdmin, isOpen, onClose }: SettingsDialogsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    role: UserRole.USER as UserRole,
    color: "#6366f1",
  });
  const logger = useLogger('SettingsDialogs');

  // Charger la liste des utilisateurs (admin uniquement)
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

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
  }, [isAdmin, logger]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUsers();
        setIsCreateMode(false);
        setFormData({ username: "", name: "", password: "", role: UserRole.USER, color: "#6366f1" });
        setShowPassword(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      logger.error("Erreur creation utilisateur:", error);
      alert("Erreur lors de la création de l'utilisateur");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          ...formData,
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setEditingUser(null);
        setFormData({ username: "", name: "", password: "", role: UserRole.USER, color: "#6366f1" });
        setShowPassword(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      logger.error("Erreur mise à jour utilisateur:", error);
      alert("Erreur lors de la mise à jour de l'utilisateur");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;

    try {
      const response = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      logger.error("Erreur suppression utilisateur:", error);
      alert("Erreur lors de la suppression de l'utilisateur");
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username || "",
      name: user.name || "",
      password: "",
      role: user.role,
      color: user.color || "#6366f1",
    });
    setIsCreateMode(false);
    setShowPassword(false);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4" />;
      case "USER":
        return <UserCircle className="w-4 h-4" />;
      case "VISITOR":
        return <Eye className="w-4 h-4" />;
      default:
        return <UserCircle className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
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

  return (
    <>
      {/* Dialog Gestion des utilisateurs */}
      {isOpen && isAdmin && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

          {/* Modal Body */}
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {(isCreateMode || editingUser) && (
                  <button
                    onClick={() => {
                      setIsCreateMode(false);
                      setEditingUser(null);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    title="Retour à la liste"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {isCreateMode ? "Créer un utilisateur" : editingUser ? `Modifier ${editingUser.username}` : "Gestion des utilisateurs"}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {!isCreateMode && !editingUser && (
                  <>
                    <button
                      onClick={() => {
                        setIsCreateMode(true);
                        setEditingUser(null);
                        setFormData({ username: "", name: "", password: "", role: UserRole.USER, color: "#6366f1" });
                        setShowPassword(false);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter un utilisateur
                    </button>
                    <a
                      href="/export-db?password=export2026"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors shadow-sm"
                    >
                      <Database className="w-4 h-4" />
                      Exporter la base
                    </a>
                  </>
                )}
                <button
                  onClick={() => {
                    setIsCreateMode(false);
                    setEditingUser(null);
                    onClose();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-6">
              {isCreateMode || editingUser ? (
                <form
                  id="user-mgmt-form"
                  onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
                  className="max-w-4xl mx-auto pb-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-8 lg:gap-12">
                    {/* Colonne Gauche : Informations */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 mb-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                        <UserBadge
                          username={formData.username}
                          name={formData.name}
                          color={formData.color}
                          role={formData.role}
                          size="lg"
                        />
                        <div>
                          <h3 className="text-base font-bold text-gray-900 dark:text-white">
                            {editingUser ? "Modifier l'utilisateur" : "Nouveau membre"}
                          </h3>
                          <p className="text-xs text-gray-500">Aperçu de l&apos;Avatar</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Nom de connexion *
                        </label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                          required
                          placeholder="ex: admin"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                          placeholder="Nom affiché"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Mot de passe {editingUser && "(laisser vide pour conserver)"}
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-4 py-2.5 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition-all shadow-sm"
                            required={!editingUser}
                            placeholder="••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-indigo-500 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                          Fonction / Rôle
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                          disabled={editingUser?.username === "admin"}
                          className={`w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white transition-all shadow-sm appearance-none cursor-pointer ${editingUser?.username === "admin" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <option value="ADMIN">Administrateur</option>
                          <option value="USER">Utilisateur</option>
                          <option value="VISITOR">Visiteur</option>
                        </select>
                      </div>
                    </div>

                    {/* Colonne Droite : Couleur Avatar */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-3xl border border-gray-100 dark:border-gray-700/50 h-fit w-[160px] mx-auto md:ml-auto md:mr-0">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-indigo-500" />
                        Teinte de l&apos;Avatar
                      </label>
                      <div className="grid grid-cols-3 gap-2 w-fit">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className={`w-7 h-7 rounded-lg transition-all hover:scale-110 active:scale-95 shadow-sm ${formData.color === color ? "ring-2 ring-white dark:ring-gray-800 shadow-md scale-110 z-10" : ""
                              }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
                          Couleur personnalisée
                        </label>
                        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner w-fit pr-4">
                          <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0 overflow-hidden"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-bold text-gray-900 dark:text-white uppercase tracking-wider leading-none mb-0.5">{formData.color}</span>
                            <span className="text-[9px] text-gray-500 uppercase font-semibold leading-none">Code Hex</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons intégrés à la boîte */}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMode(false);
                        setEditingUser(null);
                        setShowPassword(false);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-all"
                    >
                      Retour à la liste
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Save className="w-4 h-4" />
                      {editingUser ? "Enregistrer les modifications" : "Créer le compte"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 lg:px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Avatar
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                          ID
                        </th>
                        <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Nom complet
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Rôle
                        </th>
                        <th className="px-3 lg:px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            Chargement...
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <td className="px-3 lg:px-4 py-3">
                              <UserBadge
                                username={user.username}
                                name={user.name}
                                color={user.color}
                                role={user.role}
                                size="md"
                              />
                            </td>
                            <td className="px-3 lg:px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                              {user.username}
                            </td>
                            <td className="hidden sm:table-cell px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {user.name || "-"}
                            </td>
                            <td className="hidden md:table-cell px-4 py-3 text-sm">
                              <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                                {getRoleIcon(user.role)}
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="px-3 lg:px-4 py-3 text-sm text-right">
                              <div className="flex items-center justify-end gap-1 sm:gap-2">
                                <button
                                  onClick={() => startEditing(user)}
                                  className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {user.username !== "admin" && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
