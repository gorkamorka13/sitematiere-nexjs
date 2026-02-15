import { Search } from "lucide-react";
import type { Project } from "@prisma/client";
import { ProjectStatus, ProjectType } from "@/lib/enums";
import { getStatusLabel } from "@/lib/utils";

interface DashboardFiltersProps {
    countries: string[];
    availableNames: string[];
    types: ProjectType[];
    statuses: ProjectStatus[];

    selectedCountry: string;
    setSelectedCountry: (country: string) => void;

    selectedName: string;
    setSelectedName: (name: string) => void;

    selectedTypes: ProjectType[];
    setSelectedTypes: (types: ProjectType[]) => void;

    selectedStatuses: ProjectStatus[];
    setSelectedStatuses: (statuses: ProjectStatus[]) => void;

    searchQuery: string;
    setSearchQuery: (query: string) => void;

    showSuggestions: boolean;
    setShowSuggestions: (show: boolean) => void;

    searchSuggestions: Project[];
    focusedSuggestionIndex: number;
    setFocusedSuggestionIndex: (index: number) => void;

    onSearchSelect: (project: Project) => void;
    handleKeyDown: (e: React.KeyboardEvent) => void;

    resetFilters: () => void;

    initialProjects: Project[]; // For finding project by name in handlers
    selectedProject: Project | null;
    triggerFit: () => void; // Passed down just in case logic needs it, though likely handled in parent

    // Handlers need to be passed or logic moved here.
    // To minimize refactoring risk, we'll keep logic in parent and pass specific handlers where possible,
    // OR replicated simple logic here.
    // The previous code had logic inside onChange. We can keep it here if we pass set functions.

    onCountryChange: (country: string) => void;
    onNameChange: (name: string) => void;
    onToggleType: (type: ProjectType) => void;
    onToggleStatus: (status: ProjectStatus) => void;
}

export function DashboardFilters({
    countries,
    availableNames,
    types,
    statuses,
    selectedCountry,
    selectedName,
    selectedTypes,
    selectedStatuses,
    searchQuery,
    setSearchQuery,
    showSuggestions,
    setShowSuggestions,
    searchSuggestions,
    focusedSuggestionIndex,
    setFocusedSuggestionIndex,
    onSearchSelect,
    handleKeyDown,
    resetFilters,
    selectedProject,
    onCountryChange,
    onNameChange,
    onToggleType,
    onToggleStatus
}: DashboardFiltersProps) {

    return (
        <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-all">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 dark:border-gray-700/50 pb-3">
                <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filtres et Recherche</h3>
                </div>
                <button
                    onClick={resetFilters}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors hover:underline"
                >
                    Réinitialiser
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-8 items-start">
                {/* Colonne Gauche : Recherche & Sélections (5/12) */}
                <div className="xl:col-span-5 flex flex-col gap-6">
                    {/* Recherche Rapide plus large et haute */}
                    <div className="relative group">
                        <label htmlFor="search" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Recherche rapide</label>
                        <div className="relative">
                            <input
                                id="search"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowSuggestions(true);
                                    setFocusedSuggestionIndex(-1);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                onKeyDown={handleKeyDown}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                placeholder="Rechercher un projet par nom..."
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-3.5 pl-12 pr-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />

                            {showSuggestions && searchSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2">
                                    {searchSuggestions.map((project, index) => (
                                        <button
                                            key={project.id}
                                            type="button"
                                            onMouseMove={() => setFocusedSuggestionIndex(index)}
                                            onClick={() => onSearchSelect(project)}
                                            className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${focusedSuggestionIndex === index
                                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                                : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold">{project.name}</span>
                                                <span className="text-xs opacity-60 italic">{project.country}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pays & Nom côte à côte sous la recherche */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="country" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Filtre Pays</label>
                            <select
                                id="country"
                                value={selectedCountry}
                                onChange={(e) => onCountryChange(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-4 pr-10 text-sm focus:border-indigo-500 border bg-white dark:bg-gray-900 dark:text-white transition-all appearance-none"
                            >
                                <option value="">Tous les pays</option>
                                {countries.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="name" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Sélection Projet</label>
                            <select
                                id="name"
                                value={selectedName}
                                onChange={(e) => onNameChange(e.target.value)}
                                className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-4 pr-10 text-sm focus:border-indigo-500 border bg-white dark:bg-gray-900 dark:text-white transition-all appearance-none"
                            >
                                <option value="">Tous les projets</option>
                                {availableNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Colonne Milieu : Statut (3/12) */}
                <div className="xl:col-span-3 bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 h-full">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Statut du Projet</span>
                    <div className="flex flex-col gap-2">
                        {statuses.map(status => (
                            <button
                                key={status}
                                onClick={() => onToggleStatus(status)}
                                className={`relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold border transition-all ${selectedStatuses.includes(status)
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${selectedStatuses.includes(status) ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <span>{getStatusLabel(status)}</span>
                                </div>
                                {selectedProject?.status === status && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 ring-4 ring-red-400/20" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Colonne Droite : Type (4/12) */}
                <div className="xl:col-span-4 bg-gray-50/50 dark:bg-gray-900/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 h-full">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Type d&apos;Ouvrage</span>
                    <div className="grid grid-cols-2 gap-2">
                        {types.map(type => (
                            <button
                                key={type}
                                onClick={() => onToggleType(type)}
                                className={`relative flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${selectedTypes.includes(type)
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                    }`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedTypes.includes(type) ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                <span className="truncate">{type}</span>
                                {selectedProject?.type === type && (
                                    <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-red-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
