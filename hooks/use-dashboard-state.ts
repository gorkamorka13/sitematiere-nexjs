import { useState, useMemo, useCallback, useEffect } from "react";
import { getProjectMedia } from "@/app/actions/project-media";
import { ProjectStatus, ProjectType } from "@/lib/enums";
import type { ProjectWithRelations } from "@/lib/types";
import { useLogger } from "@/lib/logger";

export function useDashboardState(initialProjects: ProjectWithRelations[]) {
    const logger = useLogger('useDashboardState');

    // Initialisation avec Sierra-Léone et projet "Sewa" si disponible
    const defaultProject = initialProjects.find(p =>
        p.country === "Sierra-Léone" && p.name === "Sewa"
    ) || initialProjects.find(p => p.country === "Sierra-Léone") || initialProjects[0];

    // State for search
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState<number>(-1);

    // State for filters
    const [selectedCountry, setSelectedCountry] = useState<string>(defaultProject?.country || initialProjects[0]?.country || "");
    const [selectedName, setSelectedName] = useState<string>("");
    const [selectedTypes, setSelectedTypes] = useState<ProjectType[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<ProjectStatus[]>([]);

    // State for Selected Project (for right map)
    const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(defaultProject as ProjectWithRelations || initialProjects[0] as ProjectWithRelations || null);

    // Dynamic Media state
    const [dynamicMedia, setDynamicMedia] = useState<{
        images: { url: string; name: string }[],
        pdfs: { url: string; name: string }[]
    }>({ images: [], pdfs: [] });
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    // Map state
    const [mapNonce, setMapNonce] = useState<number>(0);
    const [fitNonce, setFitNonce] = useState<number>(0);
    const [globalCenterNonce, setGlobalCenterNonce] = useState<number>(0);
    const [globalCenterPoint, setGlobalCenterPoint] = useState<[number, number] | null>(null);

    const triggerFit = useCallback(() => setFitNonce(prev => prev + 1), []);
    const triggerGlobalCenter = useCallback((lat: number, lng: number) => {
        setGlobalCenterPoint([lat, lng]);
        setGlobalCenterNonce(prev => prev + 1);
    }, []);

    // Filter lists
    const countries = useMemo(() => {
        const uniqueCountries = new Set(
            initialProjects
                .map(p => p.country)
                .filter(Boolean)
                .filter(c => c !== "Système")
        );
        return Array.from(uniqueCountries).sort();
    }, [initialProjects]);

    const types = Object.values(ProjectType);
    const statuses = Object.values(ProjectStatus);

    const filteredProjects = useMemo(() => {
        return initialProjects.filter(project => {
            if (project.country === "Système") return false;
            if (selectedCountry && project.country !== selectedCountry) return false;
            if (searchQuery.trim() && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            if (selectedTypes.length > 0 && !selectedTypes.includes(project.type as unknown as ProjectType)) return false;
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status as unknown as ProjectStatus)) return false;
            return true;
        });
    }, [initialProjects, selectedCountry, searchQuery, selectedTypes, selectedStatuses]);

    const mapProjects = useMemo(() => {
        return initialProjects.filter(project => {
            if (project.country === "Système") return false;
            if (selectedCountry && project.country !== selectedCountry) return false;
            if (selectedTypes.length > 0 && !selectedTypes.includes(project.type as unknown as ProjectType)) return false;
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(project.status as unknown as ProjectStatus)) return false;
            return true;
        });
    }, [initialProjects, selectedCountry, selectedTypes, selectedStatuses]);

    const availableNames = useMemo(() => {
        let projects = initialProjects.filter(p => p.country !== "Système");
        if (selectedCountry) {
            projects = projects.filter(p => p.country === selectedCountry);
        }
        return projects.map(p => p.name).sort();
    }, [initialProjects, selectedCountry]);

    const searchSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return initialProjects
            .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5); // Limit to 5 suggestions
    }, [searchQuery, initialProjects]);

    // Auto-select first project when filtered list changes significantly
    useEffect(() => {
        if (filteredProjects.length > 0) {
            const isSelectedStillValid = selectedProject && filteredProjects.some(p => p.id === selectedProject.id);
            if (!selectedProject || !isSelectedStillValid) {
                setSelectedProject(filteredProjects[0]);
            } else {
                const currentInFiltered = filteredProjects.find(p => p.id === selectedProject.id);
                if (currentInFiltered && currentInFiltered !== selectedProject) {
                    setSelectedProject(currentInFiltered);
                }
            }
        } else {
            setSelectedProject(null);
        }
    }, [filteredProjects, selectedProject]);

    const fetchMedia = useCallback(async (projectName: string, projectId: string) => {
        setIsLoadingMedia(true);
        try {
            const media = await getProjectMedia(projectName, projectId);
            setDynamicMedia(media);
        } catch (error) {
            logger.error("Error fetching media:", error);
            setDynamicMedia({ images: [], pdfs: [] });
        } finally {
            setIsLoadingMedia(false);
        }
    }, [logger]);

    useEffect(() => {
        if (selectedProject) {
            fetchMedia(selectedProject.name, selectedProject.id);
        } else {
            setDynamicMedia({ images: [], pdfs: [] });
        }
    }, [selectedProject, fetchMedia]);

    // Handlers
    const handleProjectSelect = useCallback((project: ProjectWithRelations) => {
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

    const handleSearchSelect = (project: ProjectWithRelations) => {
        const isSameCountry = project.country === selectedCountry;

        setSearchQuery("");
        setSelectedName(project.name);
        setSelectedCountry(project.country || "");
        setSelectedProject(project);

        if (project.status) setSelectedStatuses([project.status as unknown as ProjectStatus]);
        if (project.type) setSelectedTypes([project.type as unknown as ProjectType]);

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
                handleSearchSelect(searchSuggestions[focusedSuggestionIndex] as ProjectWithRelations);
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const handleCountryChange = (newCountry: string) => {
        setSelectedCountry(newCountry);
        setSelectedName("");
        setSelectedProject(null);
        setSearchQuery("");
        setSelectedTypes(Object.values(ProjectType));
        setSelectedStatuses(Object.values(ProjectStatus));
        triggerFit();
    };

    const handleNameChange = (projectName: string) => {
        setSelectedName(projectName);
        const project = initialProjects.find(p => p.name === projectName);
        if (project) {
            const isSameCountry = project.country === selectedCountry;
            setSelectedProject(project);
            setSelectedCountry(project.country || "");

            if (project.status) setSelectedStatuses([project.status as unknown as ProjectStatus]);
            if (project.type) setSelectedTypes([project.type as unknown as ProjectType]);

            setMapNonce(Date.now());

            if (isSameCountry) {
                triggerGlobalCenter(project.latitude, project.longitude);
            } else {
                triggerFit();
            }
        } else {
            setSearchQuery("");
            setSelectedProject(null);
            setSelectedStatuses(Object.values(ProjectStatus));
            setSelectedTypes(Object.values(ProjectType));
        }
    };

    return {
        // State
        searchQuery, setSearchQuery,
        showSuggestions, setShowSuggestions,
        focusedSuggestionIndex, setFocusedSuggestionIndex,
        selectedCountry, setSelectedCountry,
        selectedName, setSelectedName,
        selectedTypes, setSelectedTypes,
        selectedStatuses, setSelectedStatuses,
        selectedProject, setSelectedProject,
        dynamicMedia, setDynamicMedia,
        isLoadingMedia, setIsLoadingMedia,
        mapNonce, setMapNonce,
        fitNonce, setFitNonce,
        globalCenterNonce, setGlobalCenterNonce,
        globalCenterPoint, setGlobalCenterPoint,

        // Derived / Computed
        countries,
        types,
        statuses,
        filteredProjects,
        mapProjects,
        availableNames,
        searchSuggestions,

        // Actions
        triggerFit,
        triggerGlobalCenter,
        fetchMedia,
        handleProjectSelect,
        toggleType,
        toggleStatus,
        resetFilters,
        handleSearchSelect,
        handleKeyDown,
        handleCountryChange,
        handleNameChange
    };
}
