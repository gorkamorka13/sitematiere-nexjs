"use client";

import { useState } from "react";
import { FolderOpen, Users, Grid3X3, Crown } from "lucide-react";
import { ByProjectTab } from "./by-project-tab";
import { ByUserTab } from "./by-user-tab";
import { MatrixTab } from "./matrix-tab";
import { ResponsibilitiesTab } from "./responsibilities-tab";
import type { PermissionLevel } from "@/lib/permissions";

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
  project: {
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
  };
  user: User;
}

interface PermissionTabsProps {
  projects: Project[];
  users: User[];
  permissions: Permission[];
}

type TabType = "project" | "user" | "matrix" | "responsibilities";

export function PermissionTabs({ projects, users, permissions }: PermissionTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("project");

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "project", label: "Par projet", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "user", label: "Par utilisateur", icon: <Users className="w-4 h-4" /> },
    { id: "matrix", label: "Vue d'ensemble", icon: <Grid3X3 className="w-4 h-4" /> },
    { id: "responsibilities", label: "Responsabilités", icon: <Crown className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "project" && <ByProjectTab projects={projects} />}
        {activeTab === "user" && <ByUserTab users={users} projects={projects} />}
        {activeTab === "matrix" && <MatrixTab users={users} projects={projects} permissions={permissions} />}
        {activeTab === "responsibilities" && <ResponsibilitiesTab projects={projects} users={users} />}
      </div>
    </div>
  );
}
