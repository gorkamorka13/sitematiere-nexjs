"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Project, ProjectStatus, ProjectType } from "@prisma/client";
import ProjectsMapWrapper from "@/components/ui/projects-map-wrapper";
import ProjectMapWrapper from "@/components/ui/project-map-wrapper"; // Reusing the single map wrapper
import { ModeToggle } from "@/components/ui/mode-toggle";

type DashboardClientProps = {
    initialProjects: Project[];
    user: { name?: string | null; email?: string | null };
};

export default function DashboardClient({ initialProjects, user }: DashboardClientProps) {
    // State for filters
    const [selectedCountry, setSelectedCountry] = useState<string>("");
    const [selectedName, setSelectedName] = useState<string>("");
    const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

    // State for Selected Project (for right map)
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Extract unique values for dropdowns
    const countries = useMemo(() => {
        const uniqueCountries = new Set(initialProjects.map(p => p.country).filter(Boolean));
        return Array.from(uniqueCountries).sort();
    }, [initialProjects]);

    const types = Object.values(ProjectType);
    const statuses = Object.values(ProjectStatus);

    // Dependent Filter Logic
    const filteredProjects = useMemo(() => {
        return initialProjects.filter(project => {
            // Filter by Country
            if (selectedCountry && project.country !== selectedCountry) return false;

            // Filter by Name (if selected, though name usually implies a single result, useful for search)
            if (selectedName && !project.name.toLowerCase().includes(selectedName.toLowerCase())) return false;

            // Filter by Type
            if (selectedTypes.length > 0 && !selectedTypes.includes(project.type)) return false;

            // Filter by Status
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status)) return false;

            return true;
        });
    }, [initialProjects, selectedCountry, selectedName, selectedTypes, selectedStatuses]);

    // Auto-select first project when list changes or filtered
    useEffect(() => {
        if (filteredProjects.length > 0) {
            // Check if current selected is still in the list
            const isSelectedInList = selectedProject && filteredProjects.find(p => p.id === selectedProject.id);

            if (!selectedProject || !isSelectedInList) {
                // Select the first one by default (sort by name to be deterministic if needed, currently list order)
                setSelectedProject(filteredProjects[0]);
            }
        } else {
            setSelectedProject(null);
        }
    }, [filteredProjects, selectedProject]);

    // Dependent Names List (based on country selection)
    const availableNames = useMemo(() => {
        let projects = initialProjects;
        if (selectedCountry) {
            projects = projects.filter(p => p.country === selectedCountry);
        }
        return projects.map(p => p.name).sort();
    }, [initialProjects, selectedCountry]);

    // Map Projects (Reflects all filter choices)
    const mapProjects = useMemo(() => {
        return initialProjects.filter(project => {
            if (selectedCountry && project.country !== selectedCountry) return false;
            if (selectedName && !project.name.toLowerCase().includes(selectedName.toLowerCase())) return false;
            if (selectedTypes.length > 0 && !selectedTypes.includes(project.type)) return false;
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status)) return false;
            return true;
        });
    }, [initialProjects, selectedCountry, selectedName, selectedTypes, selectedStatuses]);

    // Handlers
    const handleProjectSelect = (project: Project) => {
        setSelectedProject(project);
        setSelectedCountry(project.country || "");
        setSelectedName(project.name);
    };

    const toggleType = (type: ProjectType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleStatus = (status: ProjectStatus) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
    };

    const resetFilters = () => {
        setSelectedCountry("");
        setSelectedName("");
        setSelectedTypes([]);
        setSelectedStatuses([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <nav className="bg-white dark:bg-gray-800 shadow transition-colors duration-300">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex flex-shrink-0 items-center gap-4">
                                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Sitematiere</span>
                                <div className="hidden md:flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                                    <span title="Version">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <span title="Commit Hash">{process.env.NEXT_PUBLIC_GIT_COMMIT}</span>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <span title="Build Date">{process.env.NEXT_PUBLIC_BUILD_DATE}</span>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">{process.env.NEXT_PUBLIC_CREDIT}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500 dark:text-gray-300">
                                {user?.name || user?.email}
                            </span>
                            <ModeToggle />
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="px-4 sm:px-0 mb-8">
                        <h1 className="text-2xl font-semibold leading-7 text-gray-900 dark:text-white">Dashboard</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                            Recherche et filtrage des projets.
                        </p>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8 transition-colors duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Country Select */}
                            <div>
                                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pays</label>
                                <select
                                    id="country"
                                    value={selectedCountry}
                                    onChange={(e) => {
                                        setSelectedCountry(e.target.value);
                                        setSelectedName(""); // Reset name when country changes
                                    }}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border bg-white dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Tous les pays</option>
                                    {countries.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Name Select (Dependent) */}
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du projet</label>
                                <select
                                    id="name"
                                    value={selectedName}
                                    onChange={(e) => setSelectedName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm border bg-white dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="">Tous les projets</option>
                                    {availableNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Status Checkboxes */}
                            <div>
                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Statut</span>
                                <div className="flex flex-wrap gap-2">
                                    {statuses.map(status => (
                                        <button
                                            key={status}
                                            onClick={() => toggleStatus(status)}
                                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedStatuses.includes(status)
                                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Checkboxes */}
                            <div>
                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</span>
                                <div className="flex flex-wrap gap-2">
                                    {types.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => toggleType(type)}
                                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedTypes.includes(type)
                                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={resetFilters}
                                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    </div>

                    {/* Dual Map Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 min-h-[450px]">
                        {/* Map 1: All Filtered Projects */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-[400px] flex flex-col z-0 relative overflow-hidden transition-colors">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Carte Globale (Cliquer pour sélectionner)</h3>
                            <div className="flex-grow relative w-full z-0 overflow-hidden rounded-md">
                                <ProjectsMapWrapper
                                    projects={mapProjects}
                                    onSelectProject={handleProjectSelect}
                                />
                            </div>
                        </div>

                        {/* Map 2: Selected Project */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow h-[400px] flex flex-col z-0 relative overflow-hidden transition-colors">
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Projet Sélectionné : {selectedProject?.name || "Aucun"}</h3>
                            <div className="flex-grow relative bg-gray-100 dark:bg-gray-900 rounded-md w-full z-0 overflow-hidden">
                                {selectedProject ? (
                                    <ProjectMapWrapper
                                        latitude={selectedProject.latitude}
                                        longitude={selectedProject.longitude}
                                        popupText={selectedProject.name}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                                        Sélectionnez un projet pour voir sa position.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="mt-8 flow-root">
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <div className="shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 sm:rounded-lg bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                                    {/* Scrollable Container for Tbody */}
                                    <div className="max-h-[400px] overflow-y-auto relative">
                                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Nom</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Pays</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                                        <span className="sr-only">Actions</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                                {filteredProjects.length > 0 ? (
                                                    filteredProjects.map((project) => (
                                                        <tr
                                                            key={project.id}
                                                            onClick={() => setSelectedProject(project)}
                                                            className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${selectedProject?.id === project.id
                                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-inset ring-indigo-500/20'
                                                                : ''
                                                                }`}
                                                        >
                                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{project.name}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{project.country}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{project.type}</td>
                                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${project.status === 'DONE' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-400/20' :
                                                                    project.status === 'CURRENT' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/20' :
                                                                        'bg-yellow-50 text-yellow-800 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-400/20'
                                                                    }`}>
                                                                    {project.status}
                                                                </span>
                                                            </td>
                                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                                <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                                    Voir<span className="sr-only">, {project.name}</span>
                                                                </Link>
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
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                        {filteredProjects.length} projets trouvés
                    </div>
                </div>
            </main>
        </div>
    );
}
