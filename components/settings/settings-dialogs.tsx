"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, X, UserCircle, Shield, Eye, EyeOff, Save, Trash2, Edit2, Plus, Palette } from "lucide-react";
import { UserRole } from "@prisma/client";
import UserBadge from "./user-badge";

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
  "#f43f5e", // rose vif
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
    role: "USER" as UserRole,
    color: "#6366f1",
  });

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
      console.error("Erreur lors du chargement des utilisateurs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin]);

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
        setFormData({ username: "", name: "", password: "", role: "USER", color: "#6366f1" });
        setShowPassword(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la création");
      }
    } catch (error) {
      console.error("Erreur:", error);
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
        setFormData({ username: "", name: "", password: "", role: "USER", color: "#6366f1" });
        setShowPassword(false);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Erreur:", error);
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
      console.error("Erreur:", error);
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 px-2 lg:px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestion des utilisateurs
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsCreateMode(true);
                    setEditingUser(null);
                    setFormData({ username: "", name: "", password: "", role: "USER", color: "#6366f1" });
                    setShowPassword(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isCreateMode || editingUser ? (
                <form
                  onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
                  className="space-y-4 max-w-md mx-auto"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <UserBadge
                      username={formData.username}
                      name={formData.name}
                      color={formData.color}
                      role={formData.role}
                      size="lg"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
                      </h3>
                      <p className="text-sm text-gray-500">Aperçu de la pastille</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom de connexion *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                      placeholder="ex: admin"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom complet
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Nom affiché"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mot de passe {editingUser && "(laisser vide pour ne pas changer)"}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                        required={!editingUser}
                        placeholder="••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rôle
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="ADMIN">Administrateur</option>
                      <option value="USER">Utilisateur</option>
                      <option value="VISITOR">Visiteur</option>
                    </select>
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-indigo-500" />
                      Couleur de la pastille
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                            formData.color === color ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800" : ""
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-500">Personnalisé:</span>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{formData.color}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMode(false);
                        setEditingUser(null);
                        setShowPassword(false);
                        onClose();
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                    >
                      <Save className="w-4 h-4" />
                      {editingUser ? "Mettre à jour" : "Créer"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 lg:px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Pastille
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
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            Aucun utilisateur trouvé
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
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
