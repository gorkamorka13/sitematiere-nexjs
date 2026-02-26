"use client";

import { useState, useMemo } from "react";
import { useDashboardState } from "@/hooks/use-dashboard-state";

import type { Project, Document as ProjectDocument, Video as ProjectVideo } from "@/lib/db/schema";
import { DocumentType } from "@/lib/enums";
import { UserRole } from "@/lib/auth-types";
import type { SyntheseStats } from "@/app/actions/synthese-actions";
import { SyntheseTab } from "@/components/dashboard/synthese-tab";
import ProjectsMapWrapper from "@/components/ui/projects-map-wrapper";
import ProjectMapWrapper from "@/components/ui/project-map-wrapper";

import { FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import { ProjectExportDialog } from "@/components/projects/project-export-dialog";
import AppLayout from "@/components/AppLayout";
import ProjectManagementDialog from "@/components/settings/project-management-dialog";
import FileManagementDialog from "@/components/settings/file-management-dialog";
import MediaManagementDialog from "@/components/settings/media-management-dialog";
import SettingsDialogs from "@/components/settings/settings-dialogs";

import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { ProjectProgress } from "@/components/dashboard/project-progress";
import { ProjectDescription } from "@/components/dashboard/project-description";
import { PhotoGallery } from "@/components/dashboard/photo-gallery";
import { PdfViewer } from "@/components/dashboard/pdf-viewer";
import { DashboardTable } from "@/components/dashboard/dashboard-table";
import type { ProjectWithRelations } from "@/lib/types";

type DashboardClientProps = {
    initialProjects: ProjectWithRelations[];
    syntheseStats: SyntheseStats;
    user: { id?: string | null; name?: string | null; username?: string | null; role?: UserRole; color?: string | null };
};

export default function DashboardClient({ initialProjects, syntheseStats, user }: DashboardClientProps) {
    const {
        searchQuery, setSearchQuery,
        showSuggestions, setShowSuggestions,
        focusedSuggestionIndex, setFocusedSuggestionIndex,
        selectedCountry, setSelectedCountry,
        selectedName, setSelectedName,
        selectedTypes, setSelectedTypes,
        selectedStatuses, setSelectedStatuses,
        selectedProject,
        dynamicMedia,
        isLoadingMedia,
        mapNonce,
        fitNonce,
        globalCenterNonce,
        globalCenterPoint,

        // Derived state
        countries,
        types,
        statuses,
        filteredProjects,
        mapProjects,
        availableNames,
        searchSuggestions,

        // Actions
        triggerFit,
        handleProjectSelect,
        toggleType,
        toggleStatus,
        resetFilters,
        handleSearchSelect,
        handleKeyDown,
        handleCountryChange,
        handleNameChange
    } = useDashboardState(initialProjects);

    // Dialog & UI State (kept here because it's purely UI presentation within this component)
    const [isProjectManagementOpen, setIsProjectManagementOpen] = useState(false);
    const [projectManagementDefaultTab, setProjectManagementDefaultTab] = useState<'create' | 'modify' | 'delete'>('modify');
    const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
    const [isFileManagementOpen, setIsFileManagementOpen] = useState(false);
    const [isMediaManagementOpen, setIsMediaManagementOpen] = useState(false);
    const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'videos' | 'edit'>('photos');
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [projectToExport, setProjectToExport] = useState<ProjectWithRelations | null>(null);

    // Extraire le drapeau et le logo du client pour le projet sélectionné
    const { flagDoc, logoDoc, pinDoc } = useMemo(() => {
        const docs = (selectedProject as ProjectWithRelations | null)?.documents || [];
        return {
            flagDoc: docs.find((d: ProjectDocument) => d.type === DocumentType.FLAG),
            logoDoc: docs.find((d: ProjectDocument) => d.type === DocumentType.CLIENT_LOGO || d.name.replace(/_/g, ' ').toLowerCase().includes('logo')),
            pinDoc: docs.find((d: ProjectDocument) => d.type === DocumentType.PIN)
        };
    }, [selectedProject]);

    const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'synthese'>('dashboard');

    return (
        <AppLayout
            user={user}
            onManageUsers={() => setIsUserManagementOpen(true)}
            onManageProjects={(tab: 'create' | 'modify' | 'delete') => {
                setProjectManagementDefaultTab(tab);
                setIsProjectManagementOpen(true);
            }}
            onManageFiles={() => setIsFileManagementOpen(true)}
            onManageMedia={(tab?: 'photos' | 'videos' | 'edit') => {
                if (tab) setActiveMediaTab(tab);
                setIsMediaManagementOpen(true);
            }}
        >
            <div className="mx-auto max-w-[1800px] px-2 sm:px-4 py-6 lg:py-10">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Dashboard</h1>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                            {activeTab === 'dashboard' ? 'Recherche et filtrage des projets.' : 'Statistiques globales et indicateurs clés.'}
                        </p>
                    </div>
                    {/* Tab switcher */}
                    <div className="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 self-start sm:ml-auto">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'dashboard'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setActiveTab('synthese')}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'synthese'
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            Synthèse
                        </button>
                    </div>
                </div>

                {/* Synthese Tab */}
                {activeTab === 'synthese' && (
                    <SyntheseTab stats={syntheseStats} />
                )}

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (<>
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
                    <div className="bg-white dark:bg-gray-800 p-3 lg:px-3 lg:py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col relative overflow-hidden transition-colors">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Carte Globale</h3>
                        <div className="flex-grow relative w-full overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
                            <ProjectsMapWrapper
                                projects={mapProjects}
                                onSelectProject={handleProjectSelect}
                                selectedProjectId={selectedProject?.id}
                                fitNonce={fitNonce}
                                globalCenterNonce={globalCenterNonce}
                                globalCenterPoint={globalCenterPoint}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 lg:px-3 lg:py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-[400px] lg:h-[600px] flex flex-col relative overflow-hidden transition-colors">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 truncate">Projet : {selectedProject?.name || "Aucun"}</h3>
                        <div className="flex-grow relative bg-gray-50 dark:bg-gray-900 rounded-xl w-full overflow-hidden border border-gray-100 dark:border-gray-700">
                            {selectedProject ? (
                                <ProjectMapWrapper
                                    latitude={selectedProject.latitude}
                                    longitude={selectedProject.longitude}
                                    projectName={selectedProject.name}
                                    country={selectedProject.country || ""}
                                    popupText={selectedProject.name}
                                    description={selectedProject.description}
                                    status={selectedProject.status}
                                    customPinUrl={pinDoc?.url}
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
                        videos={(selectedProject as Project & { videos: ProjectVideo[] })?.videos || []}
                        isLoading={isLoadingMedia}
                    />
                </div>

                {/* Documents */}
                {user.role !== "VISITOR" && dynamicMedia.pdfs.length > 0 && (
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300">
                            <button
                                onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                                className="w-full border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <FolderOpen className="w-4 h-4 text-blue-500" />
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Documents & Plans</h3>
                                </div>
                                <div className="flex items-center text-gray-400">
                                    {isDocumentsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                </div>
                            </button>
                            {!isDocumentsCollapsed && (
                                <div className="p-0 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <PdfViewer documents={dynamicMedia.pdfs} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Results Table */}
                <DashboardTable
                    filteredProjects={filteredProjects}
                    selectedProject={selectedProject}
                    handleProjectSelect={handleProjectSelect}
                    onExportClick={(e, project) => {
                        e.stopPropagation();
                        handleProjectSelect(project);
                        setProjectToExport(project as ProjectWithRelations);
                        setIsExportDialogOpen(true);
                    }}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    selectedCountry={selectedCountry}
                    onCountryChange={handleCountryChange}
                    selectedTypes={selectedTypes}
                    selectedStatuses={selectedStatuses}
                    currentUser={{ id: user.id || undefined, role: user.role }}
                />

                <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right">
                    {filteredProjects.length} projets trouvés
                </div>
                </>
                )}
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

            <MediaManagementDialog
                isOpen={isMediaManagementOpen}
                onClose={() => setIsMediaManagementOpen(false)}
                projects={initialProjects}
                defaultTab={activeMediaTab}
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
