"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { getProjectMedia } from "@/app/actions/project-media";

import { Project, ProjectStatus, ProjectType, UserRole, Document as ProjectDocument, Video as ProjectVideo } from "@prisma/client";
import ProjectsMapWrapper from "@/components/ui/projects-map-wrapper";
import ProjectMapWrapper from "@/components/ui/project-map-wrapper";

import { FolderOpen } from "lucide-react";
import { ProjectExportDialog } from "@/components/projects/project-export-dialog";
import AppLayout from "@/components/AppLayout";
import ProjectManagementDialog from "@/components/settings/project-management-dialog";
import FileManagementDialog from "@/components/settings/file-management-dialog";
import SettingsDialogs from "@/components/settings/settings-dialogs";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { ProjectProgress } from "@/components/dashboard/project-progress";
import { ProjectDescription } from "@/components/dashboard/project-description";
import { PhotoGallery } from "@/components/dashboard/photo-gallery";
import { PdfViewer } from "@/components/dashboard/pdf-viewer";
import { VideoGallery } from "@/components/dashboard/video-gallery";
import { DashboardTable } from "@/components/dashboard/dashboard-table";

type DashboardClientProps = {
    initialProjects: Project[];
    user: { name?: string | null; username?: string | null; role?: UserRole; color?: string | null };
};

// Extended Project type with optional documents and videos relation
export type ProjectWithDocuments = Project & {
    documents?: ProjectDocument[];
    videos?: ProjectVideo[];
};

export default function DashboardClient({ initialProjects, user }: DashboardClientProps) {
    // Initialisation avec Sierra-Léone et projet "Sewa" si disponible
    const defaultProject = initialProjects.find(p =>
        p.country === "Sierra-Léone" && p.name === "Sewa"
    ) || initialProjects.find(p => p.country === "Sierra-Léone") || initialProjects[0];

    // State for search (declared first to avoid TDZ issues)
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);

    // State for filters
    const [selectedCountry, setSelectedCountry] = useState<string>(defaultProject?.country || initialProjects[0]?.country || "");
    const [selectedName, setSelectedName] = useState<string>(defaultProject?.name || initialProjects[0]?.name || "");
    const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

    // State for Selected Project (for right map)
    const [selectedProject, setSelectedProject] = useState<ProjectWithDocuments | null>(defaultProject as ProjectWithDocuments || initialProjects[0] as ProjectWithDocuments || null);

    // State for dynamic media from filesystem
    const [dynamicMedia, setDynamicMedia] = useState<{
        images: { url: string; name: string }[],
        pdfs: { url: string; name: string }[]
    }>({ images: [], pdfs: [] });
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);
    const [isProjectManagementOpen, setIsProjectManagementOpen] = useState(false);
    const [projectManagementDefaultTab, setProjectManagementDefaultTab] = useState<'create' | 'modify' | 'delete'>('modify');
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
    const [isFileManagementOpen, setIsFileManagementOpen] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [projectToExport, setProjectToExport] = useState<ProjectWithDocuments | null>(null);
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

    // Extraire le drapeau et le logo du client pour le projet sélectionné
    const { flagDoc, logoDoc } = useMemo(() => {
        const docs = (selectedProject as ProjectWithDocuments | null)?.documents || [];
        return {
            flagDoc: docs.find((d) => d.type === "FLAG"),
            logoDoc: docs.find((d) => d.type === "CLIENT_LOGO" || d.name.replace(/_/g, ' ').toLowerCase().includes('logo'))
        };
    }, [selectedProject]);

    // Auto-select first project when filtered list changes significantly
    useEffect(() => {
        if (filteredProjects.length > 0) {
            const isSelectedStillValid = selectedProject && filteredProjects.some(p => p.id === selectedProject.id);
            if (!selectedProject || !isSelectedStillValid) {
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





    // Map Projects for Global Map (Reflects country, type, status filters but NOT name filter)
    const mapProjects = useMemo(() => {
        return initialProjects.filter(project => {
            if (selectedCountry && project.country !== selectedCountry) return false;
            // Note: We intentionally do NOT filter by selectedName here
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
        setMapNonce(Date.now());
    }, []);

    const toggleType = (type: ProjectType) => {
        setSelectedTypes(prev => {
            if (prev.includes(type)) {
                if (prev.length === 1) return prev;
                return prev.filter(t => t !== type);
            }
            return [...prev, type];
        });
        triggerFit();
    };

    const toggleStatus = (status: ProjectStatus) => {
        setSelectedStatuses(prev => {
            if (prev.includes(status)) {
                if (prev.length === 1) return prev;
                return prev.filter(s => s !== status);
            }
            return [...prev, status];
        });
        triggerFit();
    };

    const resetFilters = () => {
        setSelectedCountry("");
        setSelectedName("");
        setSelectedTypes(Object.values(ProjectType));
        setSelectedStatuses(Object.values(ProjectStatus));
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

        setSearchQuery("");
        setSelectedName(project.name);
        setSelectedCountry(project.country || "");
        setSelectedProject(project);

        if (project.status) setSelectedStatuses([project.status]);
        if (project.type) setSelectedTypes([project.type]);

        setMapNonce(Date.now());

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


    const handleCountryChange = (newCountry: string) => {
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
    };

    const handleNameChange = (projectName: string) => {
        setSelectedName(projectName);
        const project = initialProjects.find(p => p.name === projectName);
        if (project) {
            const isSameCountry = project.country === selectedCountry;
            setSelectedProject(project);
            setSelectedCountry(project.country || "");
            if (project.status) setSelectedStatuses([project.status]);
            if (project.type) setSelectedTypes([project.type]);
            setMapNonce(Date.now());

            if (isSameCountry) {
                triggerGlobalCenter(project.latitude, project.longitude);
            } else {
                triggerFit();
            }
        } else {
            setSearchQuery("");
            setSelectedProject(null);
        }
    };

    return (
        <AppLayout
            user={user}
            onManageUsers={() => setIsUserManagementOpen(true)}
            onManageProjects={(tab: 'create' | 'modify' | 'delete') => {
                setProjectManagementDefaultTab(tab);
                setIsProjectManagementOpen(true);
            }}
            onManageFiles={() => setIsFileManagementOpen(true)}
        >
            <div className="mx-auto max-w-[1800px] px-2 sm:px-4 py-6 lg:py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Dashboard</h1>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Recherche et filtrage des projets.
                    </p>
                </div>

                {/* Filters Section */}
                <DashboardFilters
                    countries={countries}
                    availableNames={availableNames}
                    types={types}
                    statuses={statuses}
                    selectedCountry={selectedCountry}
                    setSelectedCountry={setSelectedCountry}
                    selectedName={selectedName}
                    setSelectedName={setSelectedName}
                    selectedTypes={selectedTypes}
                    setSelectedTypes={setSelectedTypes}
                    selectedStatuses={selectedStatuses}
                    setSelectedStatuses={setSelectedStatuses}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showSuggestions={showSuggestions}
                    setShowSuggestions={setShowSuggestions}
                    searchSuggestions={searchSuggestions}
                    focusedSuggestionIndex={focusedSuggestionIndex}
                    setFocusedSuggestionIndex={setFocusedSuggestionIndex}
                    onSearchSelect={handleSearchSelect}
                    handleKeyDown={handleKeyDown}
                    resetFilters={resetFilters}
                    initialProjects={initialProjects}
                    selectedProject={selectedProject}
                    triggerFit={triggerFit}
                    onCountryChange={handleCountryChange}
                    onNameChange={handleNameChange}
                    onToggleType={toggleType}
                    onToggleStatus={toggleStatus}
                />

                {/* Dual Map Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-3 lg:px-3 lg:py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col z-0 relative overflow-hidden transition-colors">
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

                    <div className="bg-white dark:bg-gray-800 p-3 lg:px-3 lg:py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col z-0 relative overflow-hidden transition-colors">
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

                {/* Avancement + Description | Photos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <div className="flex flex-col gap-6 h-full min-w-0">
                        <ProjectProgress selectedProject={selectedProject} />

                        <ProjectDescription
                            selectedProject={selectedProject}
                            flagDoc={flagDoc}
                            logoDoc={logoDoc}
                        />
                    </div>

                    <PhotoGallery
                        key={selectedProject?.id || 'no-project'}
                        selectedProject={selectedProject}
                        dynamicImages={dynamicMedia.images}
                        isLoading={isLoadingMedia}
                    />
                </div>

                {/* Documents */}
                {dynamicMedia.pdfs.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 mb-6">
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

                {/* Vidéos */}
                {selectedProject && (selectedProject as Project & { videos: ProjectVideo[] }).videos?.length > 0 && (
                    <VideoGallery videos={(selectedProject as Project & { videos: ProjectVideo[] }).videos} />
                )}

                {/* Results Table */}
                <DashboardTable
                    filteredProjects={filteredProjects}
                    selectedProject={selectedProject}
                    handleProjectSelect={handleProjectSelect}
                    onExportClick={(e, project) => {
                        e.stopPropagation();
                        handleProjectSelect(project);
                        setProjectToExport(project as ProjectWithDocuments);
                        setIsExportDialogOpen(true);
                    }}
                />

                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                    {filteredProjects.length} projets trouvés
                </div>
            </div>

            {/* Dialogs */}
            <ProjectManagementDialog
                projects={initialProjects}
                isOpen={isProjectManagementOpen}
                onClose={() => setIsProjectManagementOpen(false)}
                userRole={user.role || UserRole.VISITOR}
                defaultTab={projectManagementDefaultTab}
            />

            <FileManagementDialog
                isOpen={isFileManagementOpen}
                isAdmin={user.role === "ADMIN"}
                onClose={() => setIsFileManagementOpen(false)}
            />

            <SettingsDialogs
                isAdmin={user.role === "ADMIN"}
                isOpen={isUserManagementOpen}
                onClose={() => setIsUserManagementOpen(false)}
            />

            <ProjectExportDialog
                isOpen={isExportDialogOpen}
                onClose={() => setIsExportDialogOpen(false)}
                project={projectToExport as (Project & { documents: ProjectDocument[]; videos: ProjectVideo[] }) | null}
                allProjects={initialProjects}
                filteredProjects={mapProjects}
                images={dynamicMedia.images}
                globalMetadata={{
                    appVersion: "1.0.0",
                    buildDate: new Date().toISOString()
                }}
            />
        </AppLayout>
    );
}
