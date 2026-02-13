import { Search } from "lucide-react";
import { Project, ProjectStatus, ProjectType } from "@prisma/client";

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
            <div className="flex flex-col lg:flex-row lg:items-end gap-5">
                {/* Country & Project Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow lg:flex-grow-0 lg:min-w-[450px]">
                    {/* Country Select */}
                    <div>
                        <label htmlFor="country" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pays</label>
                        <select
                            id="country"
                            value={selectedCountry}
                            onChange={(e) => onCountryChange(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-4 pr-10 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm appearance-none"
                        >
                            <option value="">Tous les pays</option>
                            {countries.map(country => (
                                <option key={country} value={country}>{country}</option>
                            ))}
                        </select>
                    </div>

                    {/* Name Select (Dependent) */}
                    <div>
                        <label htmlFor="name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nom du projet</label>
                        <select
                            id="name"
                            value={selectedName}
                            onChange={(e) => onNameChange(e.target.value)}
                            className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-4 pr-10 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm appearance-none"
                        >
                            <option value="">Tous les projets</option>
                            {availableNames.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Smart Search Field */}
                <div className="w-full lg:max-w-[300px] relative">
                    <label htmlFor="search" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Recherche rapide</label>
                    <div className="relative group">
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
                            placeholder="Rechercher..."
                            className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-11 pr-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />

                        {showSuggestions && searchSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2">
                                {searchSuggestions.map((project, index) => (
                                    <button
                                        key={project.id}
                                        type="button"
                                        onMouseMove={() => setFocusedSuggestionIndex(index)}
                                        onClick={() => onSearchSelect(project)}
                                        className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${focusedSuggestionIndex === index
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

                {/* Status and Type Filter Group */}
                <div className="flex flex-col sm:flex-row gap-4 items-end flex-grow">
                    <div className="bg-gray-50/50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 min-w-[140px]">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 ml-1">Statut</span>
                        <div className="flex flex-col gap-1.5">
                            {statuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => onToggleStatus(status)}
                                    className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedStatuses.includes(status)
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedStatuses.includes(status) ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <span>{status}</span>
                                    {selectedProject?.status === status && (
                                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" title="Statut du projet sélectionné" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-50/50 dark:bg-gray-900/40 p-3 rounded-xl border border-gray-100 dark:border-gray-800/50 flex-grow lg:flex-grow-0">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5 ml-1">Type</span>
                        <div className="grid grid-rows-3 grid-flow-col gap-1.5">
                            {types.map(type => (
                                <button
                                    key={type}
                                    onClick={() => onToggleType(type)}
                                    className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all min-w-[110px] ${selectedTypes.includes(type)
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-200 dark:shadow-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${selectedTypes.includes(type) ? 'bg-white' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                    <span className="truncate">{type}</span>
                                    {selectedProject?.type === type && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-white dark:ring-gray-800" title="Type du projet sélectionné" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <button
                        onClick={resetFilters}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline px-2 py-1.5"
                    >
                        Réinitialiser
                    </button>
                </div>
            </div>
        </div>
    );
}
