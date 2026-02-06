"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { getProjectMedia } from "@/app/actions/project-media";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Project, ProjectStatus, ProjectType, UserRole } from "@prisma/client";
import ProjectsMapWrapper from "@/components/ui/projects-map-wrapper";
import ProjectMapWrapper from "@/components/ui/project-map-wrapper";
import { ModeToggle } from "@/components/ui/mode-toggle";
import SettingsDialogs from "@/components/settings/settings-dialogs";
import UserBadge from "@/components/settings/user-badge";
import ProjectManagementDialog from "@/components/settings/project-management-dialog";
import FileManagementDialog from "@/components/settings/file-management-dialog";
import { Search, Ruler, Factory, Truck, HardHat, FileText, FolderOpen, Image as ImageIcon, Video, ExternalLink, Eye, Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight, Square, Users, LayoutDashboard, Settings, Palette, MoreVertical, PanelLeftClose, PanelLeftOpen, Menu, X as CloseIcon, FileStack } from "lucide-react";

type DashboardClientProps = {
    initialProjects: Project[];
    user: { name?: string | null; username?: string | null; role?: UserRole; color?: string | null };
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

export default function DashboardClient({ initialProjects, user }: DashboardClientProps) {
    // Initialisation avec Sierra-Léone et projet "Sewa" si disponible
    const defaultProject = initialProjects.find(p =>
        p.country === "Sierra-Léone" && p.name === "Sewa"
    ) || initialProjects.find(p => p.country === "Sierra-Léone") || initialProjects[0];

    // State for filters
    const [selectedCountry, setSelectedCountry] = useState<string>(defaultProject?.country || initialProjects[0]?.country || "");
    const [selectedName, setSelectedName] = useState<string>(defaultProject?.name || initialProjects[0]?.name || "");
    const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);

    // State for Selected Project (for right map)
    const [selectedProject, setSelectedProject] = useState<Project | null>(defaultProject || initialProjects[0] || null);

    // State for dynamic media from filesystem
    const [dynamicMedia, setDynamicMedia] = useState<{
        images: { url: string; name: string }[],
        pdfs: { url: string; name: string }[]
    }>({ images: [], pdfs: [] });
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [isProjectManagementOpen, setIsProjectManagementOpen] = useState(false);
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
    const [isFileManagementOpen, setIsFileManagementOpen] = useState(false);

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [mapNonce, setMapNonce] = useState<number>(0);
    const [fitNonce, setFitNonce] = useState<number>(0);
    const [globalCenterNonce, setGlobalCenterNonce] = useState<number>(0);
    const [globalCenterPoint, setGlobalCenterPoint] = useState<[number, number] | null>(null);

    const triggerFit = useCallback(() => setFitNonce(prev => prev + 1), []);
    const triggerGlobalCenter = useCallback((lat: number, lng: number) => {
        setGlobalCenterPoint([lat, lng]);
        setGlobalCenterNonce(prev => prev + 1);
    }, []);

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

    // Auto-select first project when filtered list changes significantly
    useEffect(() => {
        if (filteredProjects.length > 0) {
            const isSelectedStillValid = selectedProject && filteredProjects.some(p => p.id === selectedProject.id);
            if (!selectedProject || !isSelectedStillValid) {
                // When auto-selecting, we don't necessarily want to force the dropdowns
                // to stay in sync if the user is currently using them to filter.
                // But for the initial load, they will be in sync due to initial state.
                setSelectedProject(filteredProjects[0]);
            }
        } else {
            setSelectedProject(null);
        }
    }, [filteredProjects, selectedProject]);

    // Fetch dynamic media when project changes
    const fetchMedia = useCallback(async (projectName: string) => {
        setIsLoadingMedia(true);
        try {
            const media = await getProjectMedia(projectName);
            setDynamicMedia(media);
        } catch (error) {
            console.error("Error fetching media:", error);
            setDynamicMedia({ images: [], pdfs: [] });
        } finally {
            setIsLoadingMedia(false);
        }
    }, []);

    useEffect(() => {
        if (selectedProject) {
            fetchMedia(selectedProject.name);
        } else {
            setDynamicMedia({ images: [], pdfs: [] });
        }
    }, [selectedProject, fetchMedia]);

    // Dependent Names List (based on country selection)
    const availableNames = useMemo(() => {
        let projects = initialProjects;
        if (selectedCountry) {
            projects = projects.filter(p => p.country === selectedCountry);
        }
        return projects.map(p => p.name).sort();
    }, [initialProjects, selectedCountry]);

    // Touch Swipe Logic for Mobile Menu
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchStartY, setTouchStartY] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchStartY(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null || touchStartY === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = Math.abs(touchEndY - touchStartY);

        // Seul les swipes horizontaux significatifs (> 50px) sont pris en compte
        if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 50) {
            if (deltaX > 0 && touchStartX < 50 && !isMobileMenuOpen) {
                // Swipe à droite depuis le bord gauche -> Ouvrir
                setIsMobileMenuOpen(true);
            } else if (deltaX < 0 && isMobileMenuOpen) {
                // Swipe à gauche -> Fermer
                setIsMobileMenuOpen(false);
            }
        }

        setTouchStartX(null);
        setTouchStartY(null);
    };

    // Map Projects for Global Map (Reflects country, type, status filters but NOT name filter)
    // This ensures the global map shows all projects in the selected country/region
    const mapProjects = useMemo(() => {
        return initialProjects.filter(project => {
            if (selectedCountry && project.country !== selectedCountry) return false;
            // Note: We intentionally do NOT filter by selectedName here
            // The global map should show all projects, not just the selected one
            if (selectedTypes.length > 0 && !selectedTypes.includes(project.type)) return false;
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status)) return false;
            return true;
        });
    }, [initialProjects, selectedCountry, selectedTypes, selectedStatuses]);

    // Handlers
    const handleProjectSelect = useCallback((project: Project) => {
        setSelectedProject(project);
        setSelectedCountry(project.country || "");
        setSelectedName(project.name);
        // On ne met plus à jour searchQuery ici pour le laisser vide

        // Forcer le recentrage de la carte individuelle
        setMapNonce(Date.now());
    }, []);

    const toggleType = (type: ProjectType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
        triggerFit();
    };

    const toggleStatus = (status: ProjectStatus) => {
        setSelectedStatuses(prev =>
            prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
        );
        triggerFit();
    };

    const resetFilters = () => {
        setSelectedCountry("");
        setSelectedName("");
        setSelectedTypes([]);
        setSelectedStatuses([]);
        setSearchQuery("");
        triggerFit();
    };

    // Filter projects based on search query
    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return initialProjects
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5); // Limit to 5 suggestions
    }, [searchQuery, initialProjects]);

    const handleSearchSelect = (project: Project) => {
        const isSameCountry = project.country === selectedCountry;

        setSearchQuery(""); // On vide le champ après sélection (style command palette)
        setSelectedName(project.name);
        setSelectedCountry(project.country || "");
        setSelectedProject(project);

        // Synchroniser les filtres pour éviter que le projet ne soit filtré immédiatement
        if (project.status) setSelectedStatuses([project.status]);
        if (project.type) setSelectedTypes([project.type]);

        // Centrage de la carte individuelle
        setMapNonce(Date.now());

        // Centrage de la carte globale
        if (isSameCountry) {
            triggerGlobalCenter(project.latitude, project.longitude);
        } else {
            triggerFit();
        }

        setShowSuggestions(false);
        setFocusedSuggestionIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showSuggestions || searchSuggestions.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedSuggestionIndex(prev => (prev + 1) % searchSuggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedSuggestionIndex(prev => (prev - 1 + searchSuggestions.length) % searchSuggestions.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (focusedSuggestionIndex >= 0) {
                handleSearchSelect(searchSuggestions[focusedSuggestionIndex]);
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    return (
        <div
            className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Mobile Header - Sticky */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight uppercase">Site Matière</span>
                    <div className="text-[10px] font-bold text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded ml-1">V{process.env.NEXT_PUBLIC_APP_VERSION}</div>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                    aria-label="Open Menu"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Sidebar Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] transition-opacity animate-in fade-in duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Desktop & Mobile Drawer */}
            <aside
                className={`fixed top-0 left-0 z-[60] h-screen transition-all duration-300 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
                    ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    ${isSidebarCollapsed ? "lg:w-20" : "lg:w-64"}
                    w-72 shadow-2xl lg:shadow-none`}
            >
                {/* Branding Header: Logo + Site Name */}
                <div className="flex items-center justify-between px-4 h-20 border-b border-gray-100 dark:border-gray-700 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src="/Matiere_logo_512.png"
                            alt="Matière Logo"
                            className="w-10 h-10 object-contain shrink-0"
                        />
                        {!isSidebarCollapsed && (
                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight uppercase truncate">
                                Matière
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => {
                            if (window.innerWidth < 1024) {
                                setIsMobileMenuOpen(false);
                            } else {
                                setIsSidebarCollapsed(!isSidebarCollapsed);
                            }
                        }}
                        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors shrink-0 ${isSidebarCollapsed ? "hidden" : ""}`}
                    >
                        <PanelLeftClose className="w-5 h-5" />
                    </button>
                    {isSidebarCollapsed && (
                        <button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="absolute -right-3 top-7 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm text-gray-400 hover:text-indigo-600 transition-all z-10"
                        >
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* User Section (Connection Info) */}
                <div className={`p-4 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}>
                    <div className="flex items-center gap-3 w-full bg-gray-50/50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all group hover:border-indigo-200 dark:hover:border-indigo-900/50">
                        <UserBadge
                            username={user.username || null}
                            name={user.name || null}
                            color={user.color || null}
                            role={user.role || "USER"}
                            size={isSidebarCollapsed ? "sm" : "md"}
                        />
                        {!isSidebarCollapsed && (
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider">{getRoleLabel(user.role || "USER")}</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name || user.username}</span>
                            </div>
                        )}
                    </div>
                </div>



                {/* Navigation Menus */}
                <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
                    <div className="mb-6">
                        {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Menu Principal</span>}
                        <button className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${!isSidebarCollapsed ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "justify-center text-indigo-600"}`}>
                            <LayoutDashboard className="w-5 h-5" />
                            {!isSidebarCollapsed && <span className="text-sm font-semibold">Dashboard</span>}
                        </button>
                    </div>

                    {user.role === 'ADMIN' && (
                        <div className="space-y-1">
                            {!isSidebarCollapsed && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3 mb-2 block">Administration</span>}
                            <button
                                onClick={() => setIsUserManagementOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group"
                            >
                                <Users className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Utilisateurs</span>}
                            </button>
                            <button
                                onClick={() => setIsProjectManagementOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group"
                            >
                                <FolderOpen className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Projets</span>}
                            </button>
                            <button
                                onClick={() => setIsFileManagementOpen(true)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 text-gray-600 dark:text-gray-400 transition-all group"
                            >
                                <FileStack className={`w-5 h-5 ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                                {!isSidebarCollapsed && <span className="text-sm font-medium group-hover:text-gray-900 dark:group-hover:text-white">Gestion Fichiers</span>}
                            </button>
                        </div>
                    )}
                </nav>

                {/* Sidebar Actions Footer */}
                <div className={`px-4 py-4 border-t border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? "flex flex-col items-center gap-4" : "space-y-3"}`}>
                    {isSidebarCollapsed ? (
                        <>
                            <ModeToggle />
                            <SignOutButton variant="icon" />
                        </>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-100/50 dark:border-gray-800/50 p-1.5 flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-gray-400 ml-2 tracking-wider">Thème</span>
                                <ModeToggle />
                            </div>
                            <SignOutButton variant="sidebar" />
                        </div>
                    )}
                </div>

                {/* Bottom Section: Credits */}
                <div className={`p-4 border-t border-gray-100 dark:border-gray-700 ${isSidebarCollapsed ? "flex flex-col items-center" : "space-y-4"}`}>

                    {!isSidebarCollapsed ? (
                        <div className="space-y-2">
                            <div className="flex flex-col gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                <div className="flex justify-between">
                                    <span>Version</span>
                                    <span className="text-gray-600 dark:text-gray-300">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Commit</span>
                                    <span className="text-gray-600 dark:text-gray-300">{process.env.NEXT_PUBLIC_GIT_COMMIT}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Build</span>
                                    <span className="text-gray-600 dark:text-gray-300">{process.env.NEXT_PUBLIC_BUILD_DATE}</span>
                                </div>
                            </div>
                            <div className="pt-2 text-[10px] text-center font-bold text-gray-500 dark:text-gray-400 border-t border-gray-50 dark:border-gray-800">
                                {process.env.NEXT_PUBLIC_CREDIT}
                            </div>
                        </div>
                    ) : (
                        <div className="text-[10px] font-bold text-indigo-600 rotate-90 my-4">V{process.env.NEXT_PUBLIC_APP_VERSION}</div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <main
                className={`flex-grow transition-all duration-300
                    ${isSidebarCollapsed ? "lg:ml-20" : "lg:ml-64"}
                    min-w-0 pt-16 lg:pt-0`}
            >
                <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Dashboard</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                            Recherche et filtrage des projets.
                        </p>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 transition-all">
                        <div className="flex flex-col lg:flex-row lg:items-end gap-5">
                            {/* Smart Search Field */}
                            <div className="w-full lg:max-w-[400px] relative">
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
                                        placeholder="Rechercher un projet..."
                                        className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-11 pr-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm"
                                    />
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />

                                    {/* Autocomplete Suggestions */}
                                    {showSuggestions && searchSuggestions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-auto animate-in fade-in slide-in-from-top-2">
                                            {searchSuggestions.map((project, index) => (
                                                <button
                                                    key={project.id}
                                                    type="button"
                                                    onMouseMove={() => setFocusedSuggestionIndex(index)}
                                                    onClick={() => handleSearchSelect(project)}
                                                    className={`w-full text-left px-4 py-3 transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                                                        focusedSuggestionIndex === index
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

                            {/* Country & Project Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow">
                                {/* Country Select */}
                                <div>
                                    <label htmlFor="country" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pays</label>
                                    <select
                                        id="country"
                                        value={selectedCountry}
                                        onChange={(e) => {
                                            const newCountry = e.target.value;
                                            setSelectedCountry(newCountry);
                                            triggerFit();
                                            const projectsInCountry = initialProjects
                                                .filter(p => p.country === newCountry)
                                                .sort((a, b) => a.name.localeCompare(b.name));

                                            if (projectsInCountry.length > 0) {
                                                const firstProject = projectsInCountry[0];
                                                setSelectedName(firstProject.name);
                                                setSelectedProject(firstProject);
                                                if (firstProject.status) setSelectedStatuses([firstProject.status]);
                                                if (firstProject.type) setSelectedTypes([firstProject.type]);
                                            } else {
                                                setSelectedName("");
                                                setSearchQuery("");
                                                setSelectedProject(null);
                                            }
                                        }}
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
                                        onChange={(e) => {
                                            const projectName = e.target.value;
                                            setSelectedName(projectName);
                                            const project = initialProjects.find(p => p.name === projectName);
                                            if (project) {
                                                setSelectedProject(project);
                                                if (project.status) setSelectedStatuses([project.status]);
                                                if (project.type) setSelectedTypes([project.type]);
                                            } else {
                                                setSearchQuery("");
                                                setSelectedProject(null);
                                            }
                                        }}
                                        className="block w-full rounded-xl border-gray-200 dark:border-gray-700 py-2.5 pl-4 pr-10 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 border bg-white dark:bg-gray-900 dark:text-white transition-all shadow-sm appearance-none"
                                    >
                                        <option value="">Tous les projets</option>
                                        {availableNames.map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Status Checkboxes */}
                            <div className="flex-1 min-w-[200px]">
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Statut</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {statuses.map(status => (
                                        <button
                                            key={status}
                                            onClick={() => toggleStatus(status)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border transition-colors ${selectedStatuses.includes(status)
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
                            <div className="flex-1 min-w-[200px]">
                                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {types.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => toggleType(type)}
                                            className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium border transition-colors ${selectedTypes.includes(type)
                                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reset Button */}
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

                    {/* Dual Map Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 lg:mb-16">
                        {/* Map 1: All Filtered Projects */}
                        <div className="bg-white dark:bg-gray-800 p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col z-0 relative overflow-hidden transition-colors">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Carte Globale</h3>
                            <div className="flex-grow relative w-full z-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                                <ProjectsMapWrapper
                                    projects={mapProjects}
                                    onSelectProject={handleProjectSelect}
                                    fitNonce={fitNonce}
                                    globalCenterNonce={globalCenterNonce}
                                    globalCenterPoint={globalCenterPoint}
                                />
                            </div>
                        </div>

                        {/* Map 2: Selected Project */}
                        <div className="bg-white dark:bg-gray-800 p-3 lg:p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col z-0 relative overflow-hidden transition-colors">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 truncate">Projet : {selectedProject?.name || "Aucun"}</h3>
                            <div className="flex-grow relative bg-gray-50 dark:bg-gray-900 rounded-xl w-full z-0 overflow-hidden border border-gray-100 dark:border-gray-700">
                                {selectedProject ? (
                                    <ProjectMapWrapper
                                        latitude={selectedProject.latitude}
                                        longitude={selectedProject.longitude}
                                        projectName={selectedProject.name}
                                        country={selectedProject.country || ""}
                                        popupText={selectedProject.name}
                                        status={selectedProject.status}
                                        nonce={mapNonce}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
                                        Sélectionnez un projet pour voir sa position.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* LIGNE 2: Avancement + Description | Photos */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Colonne 1: Avancement + Description */}
                        <div className="flex flex-col gap-6 h-full">
                            {/* Avancement Card */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors flex flex-col shrink-0">
                                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2">
                                    <Ruler className="w-4 h-4 text-purple-500" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Avancement du Chantier</h3>
                                </div>
                                <div className="p-4 lg:p-6 flex flex-col md:flex-row gap-6 lg:gap-8">
                                    {/* Global Progress Indicator */}
                                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 min-w-[140px]">
                                        <div className="relative flex items-center justify-center w-24 h-24 mb-3">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="48" cy="48" r="40"
                                                    fill="transparent"
                                                    stroke="currentColor" strokeWidth="6"
                                                    className="text-gray-200 dark:text-gray-700"
                                                />
                                                {(() => {
                                                    const total = (selectedProject?.prospection || 0) + (selectedProject?.studies || 0) + (selectedProject?.fabrication || 0) + (selectedProject?.transport || 0) + (selectedProject?.construction || 0);
                                                    const avg = Math.round(total / 5);
                                                    const circumference = 40 * 2 * Math.PI;
                                                    const offset = circumference - (avg / 100) * circumference;
                                                    return (
                                                        <>
                                                            <circle
                                                                cx="48" cy="48" r="40"
                                                                fill="transparent"
                                                                stroke="currentColor" strokeWidth="6"
                                                                strokeDasharray={circumference}
                                                                strokeDashoffset={offset}
                                                                strokeLinecap="round"
                                                                className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 ease-out"
                                                            />
                                                            <text x="48" y="52" textAnchor="middle" className="text-xl font-black fill-gray-900 dark:fill-white rotate-90" style={{ transformOrigin: 'center' }}>
                                                                {avg}%
                                                            </text>
                                                        </>
                                                    );
                                                })()}
                                            </svg>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Progression Globale</span>
                                    </div>

                                    {/* Timeline Workflow */}
                                    <div className="flex-grow flex flex-col gap-5 py-2">
                                        {[
                                            { label: 'Prospection', val: selectedProject?.prospection || 0, icon: <Search className="w-3.5 h-3.5" /> },
                                            { label: 'Études', val: selectedProject?.studies || 0, icon: <Ruler className="w-3.5 h-3.5" /> },
                                            { label: 'Fabrication', val: selectedProject?.fabrication || 0, icon: <Factory className="w-3.5 h-3.5" /> },
                                            { label: 'Transport', val: selectedProject?.transport || 0, icon: <Truck className="w-3.5 h-3.5" /> },
                                            { label: 'Montage', val: selectedProject?.construction || 0, icon: <HardHat className="w-3.5 h-3.5" /> }
                                        ].map((step, index, array) => (
                                            <div key={step.label} className="relative last:mb-0">
                                                {/* Connector Line */}
                                                {index !== array.length - 1 && (
                                                    <div className="absolute left-[17px] top-[24px] w-[2px] h-[34px] bg-gray-100 dark:bg-gray-700 z-0">
                                                        <div
                                                            className="absolute top-0 left-0 w-full bg-indigo-500/30 transition-all duration-1000"
                                                            style={{ height: step.val > 0 ? (index < array.length - 1 && array[index + 1].val > 0 ? '100%' : '50%') : '0%' }}
                                                        />
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 group relative z-10">
                                                    {/* Node */}
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-500 shadow-sm ${step.val === 100
                                                        ? 'bg-green-500 border-green-400 text-white'
                                                        : step.val > 0
                                                            ? 'bg-indigo-600 border-indigo-400 text-white scale-110 shadow-indigo-200 dark:shadow-none'
                                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                                        }`}>
                                                        {step.icon}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <h4 className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${step.val > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 text-[10px]'}`}>
                                                                {step.label}
                                                            </h4>
                                                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${step.val === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-900 text-gray-500'}`}>
                                                                {step.val}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-full overflow-hidden border border-gray-200/50 dark:border-gray-700/30 backdrop-blur-sm">
                                                            <div
                                                                className={`h-full transition-all duration-1000 ease-out rounded-full ${step.val === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500 shadow-[0_0_8px_rgba(79,70,229,0.3)]'}`}
                                                                style={{ width: `${step.val}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Description Card with drapeau et logo */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors flex flex-col flex-grow min-h-0">
                                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Description</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Drapeau du pays */}
                                        {selectedProject && (selectedProject as any).documents?.filter((d: any) => d.type === 'FLAG').length > 0 && (
                                            <img
                                                src={`/${(selectedProject as any).documents.find((d: any) => d.type === 'FLAG')?.url}`}
                                                alt={`Drapeau ${selectedProject.country}`}
                                                className="w-8 h-6 object-cover rounded shadow-sm"
                                                title={`Drapeau ${selectedProject.country}`}
                                            />
                                        )}
                                        {/* Logo client */}
                                        {selectedProject && (selectedProject as any).documents?.filter((d: any) => d.type === 'CLIENT_LOGO' || d.name.toLowerCase().includes('logo')).length > 0 && (
                                            <img
                                                src={`/${(selectedProject as any).documents.find((d: any) => d.type === 'CLIENT_LOGO' || d.name.toLowerCase().includes('logo'))?.url}`}
                                                alt="Logo client"
                                                className="h-6 w-auto object-contain"
                                                title="Logo client"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line overflow-y-auto custom-scrollbar">
                                    {formatDescription(selectedProject?.description) || "Sélectionnez un projet pour voir sa description."}
                                </div>
                            </div>
                        </div>

                        {/* Colonne 2: Photos */}
                        <PhotoGalleryWithControls
                            selectedProject={selectedProject}
                            dynamicImages={dynamicMedia.images}
                            isLoading={isLoadingMedia}
                        />
                    </div>

                    {/* LIGNE 3: Documents (conditionnel) */}
                    {dynamicMedia.pdfs.length > 0 && (
                        <div className="grid grid-cols-1 gap-6 mb-6">
                            {/* Documents Card - PDF Viewer */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-blue-500" />
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documents & Plans</h3>
                                    </div>
                                </div>

                                <div className="p-0">
                                    <PdfViewer documents={dynamicMedia.pdfs} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LIGNE 4: Vidéos - Conditionnel: visible uniquement s'il y a des vidéos */}
                    {selectedProject && (selectedProject as any).videos?.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-orange-500" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Vidéos & Drone</h3>
                                </div>
                                <div className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {(selectedProject as any).videos.map((vid: any) => (
                                            <div key={vid.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors cursor-pointer group">
                                                <div className="w-12 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                                                    <Video className="w-4 h-4 text-red-500" />
                                                </div>
                                                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 truncate">{vid.title || "Vidéo sans titre"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Table */}
                    <div className="mt-8 flow-root">
                        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <div className="shadow ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10 sm:rounded-lg bg-white dark:bg-gray-800 overflow-hidden transition-colors">
                                    {/* Scrollable Container for Tbody */}
                                    <div className="max-h-[400px] overflow-y-auto relative">
                                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm transition-colors">
                                                <tr>
                                                    <th scope="col" className="py-4 pl-4 pr-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest sm:pl-6">Nom</th>
                                                    <th scope="col" className="px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Pays</th>
                                                    <th scope="col" className="hidden sm:table-cell px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Type</th>
                                                    <th scope="col" className="hidden md:table-cell px-3 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                                    <th scope="col" className="relative py-4 pl-3 pr-4 sm:pr-6">
                                                        <span className="sr-only">Actions</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                                {filteredProjects.length > 0 ? (
                                                    filteredProjects.map((project) => (
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

            {/* Project Management Dialog */}
            <ProjectManagementDialog
                projects={initialProjects}
                isOpen={isProjectManagementOpen}
                onClose={() => setIsProjectManagementOpen(false)}
                isAdmin={user.role === "ADMIN"}
            />

            <FileManagementDialog
                isOpen={isFileManagementOpen}
                isAdmin={user.role === "ADMIN"}
                onClose={() => setIsFileManagementOpen(false)}
            />

            {/* User Management Dialog */}
            <SettingsDialogs
                isAdmin={user.role === "ADMIN"}
                isOpen={isUserManagementOpen}
                onClose={() => setIsUserManagementOpen(false)}
            />
        </div>
    );
}

// Helper function to format description text (replace \n with actual line breaks)
function formatDescription(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\\n/g, '\n');
}

// PDF Viewer Component
function PdfViewer({ documents }: { documents: any[] }) {
    if (!documents || documents.length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                Aucun PDF disponible
            </div>
        );
    }

    const currentPdf = documents[0]; // On affiche le premier PDF trouvé par défaut

    return (
        <div className="flex flex-col w-full h-full">
            {/* Visualiseur PDF */}
            <div className="relative w-full h-[600px]">
                <iframe
                    src={`/${currentPdf.url}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0 rounded-b-xl"
                    title={currentPdf.name}
                />
            </div>
        </div>
    );
}

// Photo Gallery Component avec diaporama intégré
function PhotoGalleryWithControls({
    selectedProject,
    dynamicImages,
    isLoading
}: {
    selectedProject: Project | null;
    dynamicImages: { url: string; name: string }[];
    isLoading: boolean;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const images = dynamicImages;

    // Reset quand on change de projet
    useEffect(() => {
        setCurrentIndex(0);
        setIsPlaying(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [selectedProject?.id]);

    // Gestion du diaporama automatique
    useEffect(() => {
        if (isPlaying && images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, 3000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, images.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToStart = () => {
        setCurrentIndex(0);
    };

    const goToEnd = () => {
        setCurrentIndex(images.length - 1);
    };

    const stopSlideshow = () => {
        setIsPlaying(false);
        setCurrentIndex(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    if (!selectedProject || (images.length === 0 && !isLoading)) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[350px]">
                    <span className="text-sm text-gray-400 italic">Aucune photo disponible</span>
                </div>
            </div>
        );
    }

    if (isLoading && images.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[350px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                        {currentIndex + 1} / {images.length}
                    </span>
                    {isPlaying && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                </div>
            </div>

            <div className="relative flex-grow flex flex-col min-h-[350px]">
                {/* Image Container */}
                <div className="flex-grow p-4">
                    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 group">
                        <img
                            src={`/${images[currentIndex].url}`}
                            alt={images[currentIndex].name || `Photo ${currentIndex + 1}`}
                            className="object-contain w-full h-full transition-opacity duration-500"
                        />

                        {/* Navigation Overlay (Visible on hover) */}
                        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={prevSlide}
                                className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-colors"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-colors"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar Layer */}
                <div className="px-4">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${((currentIndex + 1) / images.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Internal Card Controls */}
                <div className="p-4 pt-3 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={goToStart}
                            disabled={currentIndex === 0}
                            title="Premier"
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors"
                        >
                            <SkipBack className="w-4 h-4 fill-current" />
                        </button>

                        <button
                            onClick={prevSlide}
                            title="Précédent"
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        {!isPlaying ? (
                            <button
                                onClick={() => setIsPlaying(true)}
                                title="Lecture auto"
                                className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
                            >
                                <Play className="w-5 h-5 fill-current" />
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsPlaying(false)}
                                title="Pause"
                                className="p-3 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg shadow-amber-200 dark:shadow-none transition-all hover:scale-105 active:scale-95"
                            >
                                <Pause className="w-5 h-5 fill-current" />
                            </button>
                        )}

                        <button
                            onClick={stopSlideshow}
                            title="Arrêter / Reset"
                            className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>

                        <button
                            onClick={nextSlide}
                            title="Suivant"
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <button
                            onClick={goToEnd}
                            disabled={currentIndex === images.length - 1}
                            title="Dernier"
                            className="p-2 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 disabled:opacity-30 transition-colors"
                        >
                            <SkipForward className="w-4 h-4 fill-current" />
                        </button>
                    </div>

                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-gray-400 px-2">
                        <span>{isPlaying ? 'Automatique (3s)' : 'Manuel'}</span>
                        <span className="font-mono text-gray-500">
                            {images[currentIndex].name || `photo_${currentIndex + 1}`}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper Component for Progression Cards
function ProgressCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 group">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${color.replace('bg-', 'bg-').replace('500', '500/10')} text-${color.split('-')[1]}-600 dark:text-${color.split('-')[1]}-400`}>
                    {icon}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>
            </div>
            <div className="flex items-end justify-between mb-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-1000 ease-out`}
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}


// Helper Component for Action Cards
function ActionCard({ label, description, icon, href, disabled }: { label: string; description: string; icon: React.ReactNode; href: string; disabled: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all ${disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 group'
                }`}
            onClick={(e) => disabled && e.preventDefault()}
        >
            <div className={`p-3 rounded-xl bg-gray-50 dark:bg-gray-900 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors`}>
                {icon}
            </div>
            <div className="flex-grow">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {label}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">
                    {description}
                </p>
            </div>
            {!disabled && <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-indigo-400" />}
        </Link>
    );
}
