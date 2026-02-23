"use client";

import type { SyntheseStats } from "@/app/actions/synthese-actions";
import { Globe, FolderKanban, Users, CheckCircle2 } from "lucide-react";

type SyntheseTabProps = {
    stats: SyntheseStats;
};

const PHASE_LABELS: Record<string, string> = {
    prospection: "Prospection",
    studies: "Études",
    fabrication: "Fabrication",
    transport: "Transport",
    construction: "Construction",
};

const PHASE_COLORS: Record<string, string> = {
    prospection: "bg-purple-500",
    studies: "bg-blue-500",
    fabrication: "bg-amber-500",
    transport: "bg-orange-500",
    construction: "bg-green-500",
};

const TYPE_COLORS: Record<string, string> = {
    PRS: "bg-sky-500",
    PEB: "bg-indigo-500",
    MPB: "bg-teal-500",
    MXB: "bg-emerald-500",
    UB: "bg-lime-500",
    PASSERELLE: "bg-rose-500",
    AUTRE: "bg-gray-400",
};

const STATUS_CONFIG = {
    DONE: { label: "Réalisés", color: "bg-green-500", textColor: "text-green-600 dark:text-green-400" },
    CURRENT: { label: "En cours", color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400" },
    PROSPECT: { label: "Prospects", color: "bg-amber-500", textColor: "text-amber-600 dark:text-amber-400" },
};

const ROLE_CONFIG = {
    ADMIN: { label: "Administrateurs", color: "bg-rose-500" },
    USER: { label: "Utilisateurs", color: "bg-blue-500" },
    VISITOR: { label: "Visiteurs", color: "bg-gray-400" },
};

export function SyntheseTab({ stats }: SyntheseTabProps) {
    const { totalProjects, totalCountries, usersByRole, projectsByType, projectsByStatus, averageProgressByPhase } = stats;
    const totalUsers = usersByRole.ADMIN + usersByRole.USER + usersByRole.VISITOR;
    const doneProjects = projectsByStatus.DONE;

    // KPI Cards
    const kpis = [
        {
            label: "Projets",
            value: totalProjects,
            icon: FolderKanban,
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-50 dark:bg-indigo-900/30",
        },
        {
            label: "Pays",
            value: totalCountries,
            icon: Globe,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/30",
        },
        {
            label: "Utilisateurs",
            value: totalUsers,
            icon: Users,
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-900/30",
        },
        {
            label: "Réalisations",
            value: doneProjects,
            icon: CheckCircle2,
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-900/30",
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <div
                            key={kpi.label}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4 transition-colors"
                        >
                            <div className={`rounded-xl p-3 ${kpi.bg}`}>
                                <Icon className={`w-6 h-6 ${kpi.color}`} />
                            </div>
                            <div>
                                <p className="text-3xl font-black text-gray-900 dark:text-white">{kpi.value}</p>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-0.5">
                                    {kpi.label}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Projects by Status */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                        Répartition par statut
                    </h3>
                    <div className="space-y-4">
                        {(["DONE", "CURRENT", "PROSPECT"] as const).map((status) => {
                            const cfg = STATUS_CONFIG[status];
                            const count = projectsByStatus[status];
                            const pct = totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0;
                            return (
                                <div key={status}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-sm font-semibold ${cfg.textColor}`}>
                                            {cfg.label}
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            {count} <span className="text-xs text-gray-400 font-normal">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${cfg.color}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Projects by Type */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                        Répartition par type
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(projectsByType)
                            .sort((a, b) => b[1] - a[1])
                            .map(([type, count]) => {
                                const color = TYPE_COLORS[type] || "bg-gray-400";
                                return (
                                    <div
                                        key={type}
                                        className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600 rounded-xl px-3 py-2"
                                    >
                                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                            {type}
                                        </span>
                                        <span className="text-xs text-gray-400 font-normal">{count}</span>
                                    </div>
                                );
                            })}
                        {Object.keys(projectsByType).length === 0 && (
                            <p className="text-sm text-gray-400">Aucun projet</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Average Progress by Phase */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                        Progression moyenne globale
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(averageProgressByPhase).map(([phase, value]) => {
                            const color = PHASE_COLORS[phase] || "bg-gray-400";
                            return (
                                <div key={phase}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {PHASE_LABELS[phase] || phase}
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            {value}%
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${color}`}
                                            style={{ width: `${value}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Users by Role */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 transition-colors">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                        Répartition des utilisateurs
                    </h3>
                    <div className="space-y-4">
                        {(["ADMIN", "USER", "VISITOR"] as const).map((role) => {
                            const cfg = ROLE_CONFIG[role];
                            const count = usersByRole[role];
                            const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                            return (
                                <div key={role}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {cfg.label}
                                        </span>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                            {count} <span className="text-xs text-gray-400 font-normal">({pct}%)</span>
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${cfg.color}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
