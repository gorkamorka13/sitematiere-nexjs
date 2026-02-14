import { Project, ProjectStatus, ProjectType } from "@prisma/client";
import { Download, Search, ArrowUpDown, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { getStatusLabel } from "@/lib/utils";
import { useState, useMemo } from "react";

interface DashboardTableProps {
    filteredProjects: Project[];
    selectedProject: Project | null;
    handleProjectSelect: (project: Project) => void;
    onExportClick: (e: React.MouseEvent, project: Project) => void;

    // Ajout des props de synchronisation
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedCountry: string;
    onCountryChange: (country: string) => void;
    selectedTypes: ProjectType[];
    selectedStatuses: ProjectStatus[];
}

type SortConfig = {
    key: keyof Project | 'statusLabel';
    direction: 'asc' | 'desc';
} | null;

export function DashboardTable({
    filteredProjects,
    selectedProject,
    handleProjectSelect,
    onExportClick,
    searchQuery,
    setSearchQuery,
    selectedCountry,
    onCountryChange
}: DashboardTableProps) {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

    const handleSort = (key: keyof Project | 'statusLabel') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedProjects = useMemo(() => {
        // La liste arrive déjà filtrée par le parent (Pays, Type, Statut, Recherche Globale)
        // On ne fait ici que le tri
        const result = [...filteredProjects];

        // Sort
        if (sortConfig) {
            result.sort((a, b) => {
                let aValue: string | number | boolean | null | undefined;
                let bValue: string | number | boolean | null | undefined;

                if (sortConfig.key === 'statusLabel') {
                    aValue = getStatusLabel(a.status);
                    bValue = getStatusLabel(b.status);
                } else {
                    const key = sortConfig.key as keyof Project;
                    const valA = a[key];
                    const valB = b[key];
                    aValue = (typeof valA === 'string' || typeof valA === 'number' || typeof valA === 'boolean' || valA === null) ? valA : String(valA);
                    bValue = (typeof valB === 'string' || typeof valB === 'number' || typeof valB === 'boolean' || valB === null) ? valB : String(valB);
                }

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    }, [filteredProjects, sortConfig]);

    const SortIcon = ({ columnKey }: { columnKey: keyof Project | 'statusLabel' }) => {
        if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUpIcon className="ml-1 w-3 h-3 text-indigo-500" />
            : <ArrowDownIcon className="ml-1 w-3 h-3 text-indigo-500" />;
    };

    return (
        <div className="mt-8 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 sm:rounded-lg bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                        <div className="max-h-[500px] overflow-y-auto relative">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm transition-colors">
                                    <tr>
                                        {/* Name Column */}
                                        <th scope="col" className="py-2 pl-4 pr-3 text-left sm:pl-6 min-w-[150px]">
                                            <button
                                                onClick={() => handleSort('name')}
                                                className="group inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
                                            >
                                                Nom
                                                <SortIcon columnKey="name" />
                                            </button>
                                            <div className="mt-1 relative">
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder="Filtrer..."
                                                    className="block w-full rounded-md border-0 py-1 pl-7 pr-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-xs transition-shadow shadow-sm"
                                                />
                                                <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
                                            </div>
                                        </th>

                                        {/* Country Column */}
                                        <th scope="col" className="px-3 py-2 text-left min-w-[120px]">
                                            <button
                                                onClick={() => handleSort('country')}
                                                className="group inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
                                            >
                                                Pays
                                                <SortIcon columnKey="country" />
                                            </button>
                                            <div className="mt-1 relative">
                                                <input
                                                    type="text"
                                                    value={selectedCountry}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => onCountryChange(e.target.value)}
                                                    placeholder="Filtrer..."
                                                    className="block w-full rounded-md border-0 py-1 pl-7 pr-2 text-gray-900 dark:text-white bg-white dark:bg-gray-800 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-xs transition-shadow shadow-sm"
                                                />
                                                <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-400 pointer-events-none" />
                                            </div>
                                        </th>

                                        {/* Type Column */}
                                        <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left">
                                            <button
                                                onClick={() => handleSort('type')}
                                                className="group inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
                                            >
                                                Type
                                                <SortIcon columnKey="type" />
                                            </button>
                                        </th>

                                        {/* Status Column */}
                                        <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left">
                                            <button
                                                onClick={() => handleSort('statusLabel')}
                                                className="group inline-flex items-center text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
                                            >
                                                Statut
                                                <SortIcon columnKey="statusLabel" />
                                            </button>
                                        </th>

                                        <th scope="col" className="relative py-2 pl-3 pr-4 sm:pr-6 align-top">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {processedProjects.length > 0 ? (
                                        processedProjects.map((project) => (
                                            <tr
                                                key={project.id}
                                                onClick={() => handleProjectSelect(project)}
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProject?.id === project.id
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-inset ring-indigo-500/20'
                                                    : ''
                                                    }`}
                                            >
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">{project.name}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400 font-medium">{project.country}</td>
                                                <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{project.type}</td>
                                                <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${project.status === 'DONE' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/20' :
                                                        project.status === 'CURRENT' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20' :
                                                            'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-200 dark:ring-yellow-400/30'
                                                        }`}>
                                                        {getStatusLabel(project.status)}
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        onClick={(e) => onExportClick(e, project)}
                                                        className="flex items-center gap-1.5 ml-auto text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg transition-colors group"
                                                        title="Générer Rapport PDF"
                                                        aria-label={`Générer le rapport PDF du projet ${project.name}`}
                                                    >
                                                        <Download className="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
                                                        <span className="font-bold">PDF</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                Aucun projet ne correspond à vos critères.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
