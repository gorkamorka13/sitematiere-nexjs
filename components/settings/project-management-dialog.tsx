"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, MapPin, AlignLeft, FolderOpen, AlertCircle, CheckCircle2, Globe, Search, Undo2, Redo2, Plus, Trash2, Edit, UploadCloud, Image as ImageIcon, Lock, Users, Eye } from "lucide-react";
import NextImage from "next/image";
import type { Project, Document as ProjectDocument } from "@/lib/db/schema";
import { ProjectType, ProjectStatus, DocumentType } from "@/lib/enums";
import { UserRole } from "@/lib/auth-types";
import { updateProject, createProject, deleteProject } from "@/app/actions/project-actions";
import EditableMapWrapper from "@/components/ui/editable-map-wrapper";
import { decimalToDMS, dmsToDecimal, isValidLatitude, isValidLongitude } from "@/lib/coordinate-utils";
import { FileUploadZone } from "../files/file-upload-zone";
import { FileUploadProgress, FileUploadState } from "../files/file-upload-progress";
import { DatabaseImagePicker } from "../image-processor/DatabaseImagePicker";
import { Toast } from "@/components/ui/toast";
import { getStatusLabel } from "@/lib/utils";

interface ProjectManagementDialogProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  userRole: UserRole;
  defaultTab?: 'create' | 'modify' | 'delete';
}

export default function ProjectManagementDialog({ projects, isOpen, onClose, userRole, defaultTab }: ProjectManagementDialogProps) {
  const isAdmin = userRole === 'ADMIN';
  const canModify = isAdmin || userRole === 'USER';
  const [activeTab, setActiveTab] = useState<'create' | 'modify' | 'delete'>(defaultTab || 'modify');

  // Synchroniser activeTab avec defaultTab quand le dialogue s'ouvre
  useEffect(() => {
    if (isOpen && defaultTab) {
      // Sécurité : si un non-admin essaie d'ouvrir un onglet restreint, forcer 'modify'
      if (!isAdmin && (defaultTab === 'create' || defaultTab === 'delete')) {
        setActiveTab('modify');
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [isOpen, defaultTab, isAdmin]);

  // Réinitialiser la sélection lors du changement d'onglet pour éviter l'auto-sélection confuse
  useEffect(() => {
    setSelectedProjectId("");
    setConfirmName("");
    setSearchQuery("");
    setCountryFilter("Tous"); // Réinitialiser le filtre pays

    // Initialiser l'historique selon l'onglet
    if (activeTab === 'create') {
      setPositionHistory([{ lat: 44.916672, lng: 2.45 }]);
      setHistoryIndex(0);
    } else {
      setPositionHistory([]);
      setHistoryIndex(-1);
    }
  }, [activeTab]);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [formData, setFormData] = useState({
    latitude: 0,
    longitude: 0,
    description: "",
    prospection: 0,
    studies: 0,
    fabrication: 0,
    transport: 0,
    construction: 0,
    flagName: "",
    clientLogoName: "",
    pinName: "",
    status: ProjectStatus.PROSPECT,
    ownerId: "",
    visible: false,
  });

  const [createFormData, setCreateFormData] = useState({
    name: "",
    country: "",
    type: ProjectType.PRS,
    status: ProjectStatus.PROSPECT,
    latitude: 44.916672,
    longitude: 2.45,
    description: "",
    projectCode: "",
    prospection: 0,
    studies: 0,
    fabrication: 0,
    transport: 0,
    construction: 0,
    flagName: "",
    clientLogoName: "",
    pinName: "",
    assignToUserId: "",
    createUserIfNotExists: false,
    newUserUsername: "",
    newUserName: "",
    newUserPassword: "",
    newUserRole: "USER" as UserRole,
    visible: false,
  });

  const [confirmName, setConfirmName] = useState("");
  const [coordinateFormat, setCoordinateFormat] = useState<'decimal' | 'dms'>('decimal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Phase 3: Upload State
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);
  const [countryFilter, setCountryFilter] = useState<string>("Tous");

  // Historique des positions pour undo/redo
  const [positionHistory, setPositionHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFlagPickerOpen, setIsFlagPickerOpen] = useState(false);
  const [isLogoPickerOpen, setIsLogoPickerOpen] = useState(false);
  const [isPinPickerOpen, setIsPinPickerOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; username: string; name: string | null; role: string; color: string | null }[]>([]);

  // Handle map marker position change
  const handleMapPositionChange = (lat: number, lng: number, isFinal: boolean = true) => {
    // Mettre à jour le formulaire approprié
    if (activeTab === 'create') {
      setCreateFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    } else {
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    }

    // N'ajouter à l'historique que si c'est une position finale (relâchement de la souris)
    if (isFinal) {
      setPositionHistory(prev => {
        // Supprimer l'historique après l'index actuel si on ajoute une nouvelle position
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ lat, lng });
        // Limiter à 50 positions
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    }
  };

  // Fonction Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const pos = positionHistory[newIndex];
      if (pos) {
        if (activeTab === 'create') {
          setCreateFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        } else {
          setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        }
      }
    }
  }, [historyIndex, positionHistory, activeTab]);

  // Fonction Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < positionHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const pos = positionHistory[newIndex];
      if (pos) {
        if (activeTab === 'create') {
          setCreateFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        } else {
          setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        }
      }
    }
  }, [historyIndex, positionHistory, activeTab]);

  // Initialiser l'historique quand on sélectionne un projet (Onglet Modifier)
  useEffect(() => {
    if (activeTab === 'modify' && selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId);
      if (project) {
        setPositionHistory([{ lat: project.latitude ?? 0, lng: project.longitude ?? 0 }]);
        setHistoryIndex(0);
      }
    }
  }, [selectedProjectId, activeTab, projects]);

  // Raccourcis clavier Ctrl+Z (Undo) et Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Handle coordinate input change with format conversion
  const handleCoordinateChange = (value: string, field: 'latitude' | 'longitude') => {
    try {
      let decimal: number;
      if (coordinateFormat === 'dms') {
        decimal = dmsToDecimal(value);
      } else {
        decimal = parseFloat(value) || 0;
      }

      // Validate coordinates
      if (field === 'latitude' && !isValidLatitude(decimal)) {
        setStatus({ type: 'error', message: 'Latitude doit être entre -90 et +90' });
        return;
      }
      if (field === 'longitude' && !isValidLongitude(decimal)) {
        setStatus({ type: 'error', message: 'Longitude doit être entre -180 et +180' });
        return;
      }

      // Clear error status if validation passes
      setStatus(null);

      // Mettre à jour le formulaire
      const newLat = field === 'latitude' ? decimal : (formData.latitude ?? 0);
      const newLng = field === 'longitude' ? decimal : (formData.longitude ?? 0);

      setFormData(prev => ({
        ...prev,
        [field]: decimal ?? 0
      }));

      // Ajouter à l'historique
      setPositionHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push({ lat: newLat, lng: newLng });
        if (newHistory.length > 50) {
          newHistory.shift();
        }
        return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, 49));
    } catch {
      // Invalid format, don't update
      setStatus({ type: 'error', message: `Format ${coordinateFormat === 'dms' ? 'DMS' : 'décimal'} invalide` });
    }
  };

  // Charger tous les utilisateurs pour la liste déroulante Propriétaire (Admins uniquement)
  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    fetch('/api/users')
      .then(res => res.ok ? res.json() : [])
      .then(data => setAllUsers(Array.isArray(data) ? data : []))
      .catch(() => setAllUsers([]));
  }, [isOpen, isAdmin]);

  // Extract unique countries from projects
  const countries = Array.from(
    new Set((projects || []).map(p => p.country).filter(Boolean))
  ).sort();

  // Logic de recherche avec filtre pays
  const filteredProjects = (projects || []).filter(p => {
    if (countryFilter === "Tous") return true;
    return p.country === countryFilter;
  });

  const sortedProjects = filteredProjects.slice().sort((a, b) => a.name.localeCompare(b.name));

  const searchSuggestions = filteredProjects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const handleSearchSelect = (project: Project) => {
    setSelectedProjectId(project.id);
    setSearchQuery(""); // On vide après sélection
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

  // Mettre à jour les champs lors du changement de projet
  useEffect(() => {
    if (selectedProjectId) {
      const project = projects.find(p => p.id === selectedProjectId) as Project & { documents: ProjectDocument[] };
      if (project) {
        const flagDoc = project.documents?.find((d) => d.type === DocumentType.FLAG);
        const logoDoc = project.documents?.find((d) => d.type === DocumentType.CLIENT_LOGO || d.name.toLowerCase().includes('logo'));
        const pinDoc = project.documents?.find((d) => d.type === DocumentType.PIN);

        setFormData({
          latitude: project.latitude ?? 0,
          longitude: project.longitude ?? 0,
          description: project.description || "",
          prospection: project.prospection || 0,
          studies: project.studies || 0,
          fabrication: project.fabrication || 0,
          transport: project.transport || 0,
          construction: project.construction || 0,
          pinName: pinDoc?.url || "",
          flagName: flagDoc?.url || "",
          clientLogoName: logoDoc?.url || "",
          status: (project.status as unknown as ProjectStatus) || ProjectStatus.PROSPECT,
          ownerId: project.ownerId || "",
          visible: project.visible ?? false,
        });
        setStatus(null);
      }
    } else {
      setFormData({
        latitude: 0,
        longitude: 0,
        description: "",
        prospection: 0,
        studies: 0,
        fabrication: 0,
        transport: 0,
        construction: 0,
        flagName: "",
        clientLogoName: "",
        pinName: "",
        status: ProjectStatus.PROSPECT,
        ownerId: "",
        visible: false,
      });
    }
  }, [selectedProjectId, projects]);

  if (!isOpen || !canModify) return null;

  const handleFilesSelected = (files: File[]) => {
    const newUploads = files.map(file => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setUploads(prev => [...prev, ...newUploads]);
  };

  const processUploads = async (projectId: string) => {
    setIsUploading(true);
    const uploadPromises = uploads.map(async (upload) => {
      if (upload.status === "success") return;

      updateUploadStatus(upload.file, { status: "uploading", progress: 0 });

      const formData = new FormData();
      formData.append("file", upload.file);
      formData.append("projectId", projectId);

      return new Promise<void>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/files/upload');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            updateUploadStatus(upload.file, { progress: percentComplete });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            updateUploadStatus(upload.file, { status: "success", progress: 100 });
          } else {
            updateUploadStatus(upload.file, { status: "error", error: "Upload failed" });
          }
          resolve();
        };

        xhr.onerror = () => {
          updateUploadStatus(upload.file, { status: "error", error: "Network error" });
          resolve();
        };

        xhr.send(formData);
      });
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
  };

  const updateUploadStatus = (file: File, updates: Partial<FileUploadState>) => {
    setUploads(prev => prev.map(u =>
      u.file === file ? { ...u, ...updates } : u
    ));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await createProject(createFormData);

      if (result.success && result.projectId) {
        // Start uploads if any
        if (uploads.length > 0) {
          await processUploads(result.projectId);
        }
        setToast({ type: 'success', message: "Projet créé avec succès !" });
        // Reset form
        setCreateFormData({
          name: "",
          country: "",
          type: ProjectType.PRS,
          status: ProjectStatus.PROSPECT,
          latitude: 44.916672,
          longitude: 2.45,
          description: "",
          projectCode: "",
          prospection: 0,
          studies: 0,
          fabrication: 0,
          transport: 0,
          construction: 0,
          flagName: "",
          clientLogoName: "",
          pinName: "",
          assignToUserId: "",
          createUserIfNotExists: false,
          newUserUsername: "",
          newUserName: "",
          newUserPassword: "",
          newUserRole: "USER" as UserRole,
          visible: false,
        });
        setUploads([]);

        setTimeout(() => {
          setActiveTab('modify');
          setSelectedProjectId(result.projectId || "");
        }, 2000);
      } else {
        setToast({ type: 'error', message: result.error || "Une erreur est survenue lors de la création." });
      }
    } catch {
      setToast({ type: 'error', message: "Erreur de communication avec le serveur." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProjectId) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await deleteProject(selectedProjectId, confirmName);

      if (result.success) {
        setToast({ type: 'success', message: "Projet supprimé définitivement." });
        setSelectedProjectId("");
        setConfirmName("");
        setTimeout(() => {
          setActiveTab('modify');
        }, 1500);
      } else {
        setToast({ type: 'error', message: result.error || "Une erreur est survenue lors de la suppression." });
      }
    } catch {
      setToast({ type: 'error', message: "Erreur de communication avec le serveur." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'create') {
      return handleCreate(e);
    }

    if (!selectedProjectId) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await updateProject({
        id: selectedProjectId,
        latitude: formData.latitude,
        longitude: formData.longitude,
        description: formData.description,
        prospection: formData.prospection,
        studies: formData.studies,
        fabrication: formData.fabrication,
        transport: formData.transport,
        construction: formData.construction,
        flagName: formData.flagName,
        clientLogoName: formData.clientLogoName,
        pinName: formData.pinName,
        status: formData.status,
        ownerId: isAdmin ? formData.ownerId : undefined,
        visible: formData.visible,
      });

      if (result.success) {
        setToast({ type: 'success', message: "Projet mis à jour avec succès !" });
        // Optionnel: on pourrait rafraîchir la liste des projets ici si nécessaire
      } else {
        setToast({ type: 'error', message: result.error || "Une erreur est survenue lors de la mise à jour." });
      }
    } catch {
      setToast({ type: 'error', message: "Erreur de communication avec le serveur." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700 transition-all animate-in fade-in zoom-in duration-200 flex flex-col"
      >
        {/* Header - Draggable */}
        <div
          className="flex flex-col border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 select-none"
        >
          <div
            className="flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">
                {activeTab === 'create' ? <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> :
                  activeTab === 'modify' ? <Edit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> :
                    <Trash2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                {activeTab === 'create' ? 'Création de projet' :
                  activeTab === 'modify' ? 'Modification de projets' :
                    'Suppression de projet'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex px-4 sm:px-5 gap-4 sm:gap-6 overflow-x-auto min-w-0 border-b border-gray-100 dark:border-gray-700 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {isAdmin && (
              <button
                onClick={() => setActiveTab('create')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap shrink-0 ${activeTab === 'create'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
              >
                Créer
              </button>
            )}
            <button
              onClick={() => setActiveTab('modify')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap shrink-0 ${activeTab === 'modify'
                ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200'
                }`}
            >
              Modifier
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('delete')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap shrink-0 ${activeTab === 'delete'
                  ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
              >
                Supprimer
              </button>
            )}
            <div className="w-8 shrink-0" aria-hidden="true" />
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <div className="overflow-y-auto max-h-[calc(90vh-160px)] flex-1">
          {activeTab === 'modify' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Filtre pays, Sélection du projet et Recherche Rapide */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Filtre par pays */}
                <div className="flex-1 md:flex-[0.25]">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filtrer par pays</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => {
                      setCountryFilter(e.target.value);
                      setSelectedProjectId(""); // Réinitialiser la sélection quand on change de pays
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                  >
                    <option value="Tous">Tous les pays</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 md:flex-[0.35]">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Choisir un projet</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                    required
                  >
                    <option value="">
                      {sortedProjects.length === 0 ? "Aucun projet" : "-- Sélectionner --"}
                    </option>
                    {sortedProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 md:flex-[0.4] relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recherche rapide</label>
                  <div className="relative">
                    <input
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
                      placeholder="Tapez le nom d'un ouvrage..."
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                    {/* Autocomplete Suggestions */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute z-[110] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {searchSuggestions.map((project: Project, index: number) => (
                          <button
                            key={project.id}
                            type="button"
                            onMouseMove={() => setFocusedSuggestionIndex(index)}
                            onClick={() => handleSearchSelect(project)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${focusedSuggestionIndex === index
                              ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                              : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{project.name}</span>
                              <span className="text-xs opacity-60 italic">{project.country}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Map Section */}
              {selectedProjectId && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-500" /> Position sur la Carte
                  </label>
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm">
                    <EditableMapWrapper
                      latitude={formData.latitude}
                      longitude={formData.longitude}
                      onPositionChange={handleMapPositionChange}
                      status={formData.status}
                      customPinUrl={formData.pinName}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic">
                    💡 Déplacez le marqueur sur la carte pour ajuster les coordonnées
                  </p>
                </div>
              )}

              {/* Labels des coordonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Label Latitude */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" /> Latitude
                    </span>
                  </label>
                </div>

                {/* Label Longitude */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" /> Longitude
                    </span>
                  </label>
                </div>
              </div>

              {/* Ligne des inputs avec boutons Undo/Redo */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                {/* Input Latitude */}
                <div>
                  <input
                    type="text"
                    value={coordinateFormat === 'decimal' ? (formData.latitude ?? 0) : decimalToDMS(formData.latitude ?? 0, true)}
                    onChange={(e) => handleCoordinateChange(e.target.value, 'latitude')}
                    disabled={!selectedProjectId}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all dark:text-white font-mono text-sm"
                    placeholder={coordinateFormat === 'decimal' ? '8.4657' : '8° 27\' 56" N'}
                    required
                  />
                </div>

                {/* Input Longitude */}
                <div>
                  <input
                    type="text"
                    value={coordinateFormat === 'decimal' ? (formData.longitude ?? 0) : decimalToDMS(formData.longitude ?? 0, false)}
                    onChange={(e) => handleCoordinateChange(e.target.value, 'longitude')}
                    disabled={!selectedProjectId}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all dark:text-white font-mono text-sm"
                    placeholder={coordinateFormat === 'decimal' ? '-13.2317' : '13° 13\' 54" W'}
                    required
                  />
                </div>

                {/* Boutons Undo/Redo à droite */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800 shadow-sm">
                    {/* Format Toggle Button - Unique per row */}
                    <button
                      type="button"
                      onClick={() => setCoordinateFormat(prev => prev === 'decimal' ? 'dms' : 'decimal')}
                      className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5"
                      title={coordinateFormat === 'decimal' ? "Passer en DMS" : "Passer en Décimal"}
                    >
                      {coordinateFormat === 'decimal' ? <MapPin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                      <span className="text-[10px] font-bold uppercase">{coordinateFormat === 'decimal' ? 'DMS' : 'DEC'}</span>
                    </button>

                    <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0 || !selectedProjectId}
                      className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                      title="Annuler (Ctrl+Z)"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={historyIndex >= positionHistory.length - 1 || !selectedProjectId}
                      className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                      title="Rétablir (Ctrl+Y)"
                    >
                      <Redo2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ligne des exemples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-4">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {coordinateFormat === 'decimal' ? 'Ex: 8.4657' : 'Ex: 8° 27\' 56" N'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {coordinateFormat === 'decimal' ? 'Ex: -13.2317' : 'Ex: 13° 13\' 54" W'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-gray-400" /> Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={!selectedProjectId}
                  rows={6}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all dark:text-white resize-none"
                  placeholder="Saisissez la description du projet..."
                />
              </div>

              {/* Avancement du Projet */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-500" /> Avancement du Projet
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { label: "Prospection", key: "prospection" },
                    { label: "Études", key: "studies" },
                    { label: "Fabrication", key: "fabrication" },
                    { label: "Transport", key: "transport" },
                    { label: "Montage", key: "construction" },
                  ].map((step) => (
                    <div key={step.key}>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{step.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={(formData as any)[step.key] === 0 ? "" : (formData as any)[step.key]}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === "0") {
                            setFormData({ ...formData, [step.key]: 0 });
                          } else {
                            // Supprimer les zéros en début de chaîne
                            const cleanValue = value.replace(/^0+/, "") || "0";
                            const numValue = parseInt(cleanValue, 10);
                            if (!isNaN(numValue)) {
                              setFormData({ ...formData, [step.key]: Math.min(100, Math.max(0, numValue)) });
                            }
                          }
                        }}
                        disabled={!selectedProjectId}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Statut du Projet */}
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Statut du Projet</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1 w-full">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                      disabled={!selectedProjectId}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    >
                      {Object.values(ProjectStatus).map(s => (
                        <option key={s} value={s}>
                          {getStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Aperçu du Pin Réel */}
                  {selectedProjectId && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 shrink-0">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pin Actuel :</span>
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 shadow-sm">
                        <NextImage
                          src={formData.pinName && (formData.pinName.startsWith('http') || formData.pinName.startsWith('/'))
                            ? formData.pinName
                            : (formData.status === 'DONE' ? 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/realise.png'
                               : formData.status === 'CURRENT' ? 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/en_cours.png'
                               : 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/prospection.png')}
                          alt="Pin"
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 italic">
                  Le pin sur la carte sera automatiquement mis à jour selon le statut choisi (sauf si un pin personnalisé est sélectionné).
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Identité Visuelle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Drapeau */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Drapeau du Pays
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                        {formData.flagName ? (
                          <NextImage
                            src={formData.flagName.startsWith('http') || formData.flagName.startsWith('/') ? formData.flagName : `/${formData.flagName}`}
                            alt="Drapeau"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        )}
                        <button
                          type="button"
                          onClick={() => setIsFlagPickerOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          Choisir
                        </button>
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setIsFlagPickerOpen(true)}
                          className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 transition-all text-xs text-gray-500 dark:text-gray-400 truncate"
                        >
                          {formData.flagName ? formData.flagName.split('/').pop() : "Sélectionner une image..."}
                        </button>
                        {formData.flagName && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, flagName: "" })}
                            className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logo Client */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Logo Client
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                        {formData.clientLogoName ? (
                          <NextImage
                            src={formData.clientLogoName.startsWith('http') || formData.clientLogoName.startsWith('/') ? formData.clientLogoName : `/${formData.clientLogoName}`}
                            alt="Logo"
                            fill
                            className="object-contain p-2"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        )}
                        <button
                          type="button"
                          onClick={() => setIsLogoPickerOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          Choisir
                        </button>
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setIsLogoPickerOpen(true)}
                          className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 transition-all text-xs text-gray-500 dark:text-gray-400 truncate"
                        >
                          {formData.clientLogoName ? formData.clientLogoName.split('/').pop() : "Sélectionner une image..."}
                        </button>
                        {formData.clientLogoName && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, clientLogoName: "" })}
                            className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accès et Visibilité */}
                  <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-500" />
                      Accès et Visibilité
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Visibilité */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Eye className="w-3 h-3" /> Visibilité
                        </label>
                        <select
                          value={formData.visible ? "true" : "false"}
                          onChange={(e) => setFormData(prev => ({ ...prev, visible: e.target.value === "true" }))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                          <option value="true">Visible (Public)</option>
                          <option value="false">Masqué (Privé)</option>
                        </select>
                      </div>

                      {/* Propriétaire (Admin seulement pour modif) */}
                      {isAdmin && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Users className="w-3 h-3" /> Propriétaire
                          </label>
                          <select
                            value={formData.ownerId}
                            onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                            disabled={!selectedProjectId}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm transition-all focus:ring-2 focus:ring-indigo-500/20 outline-none disabled:opacity-50"
                          >
                            <option value="">— Sélectionner un propriétaire —</option>
                            {allUsers
                              .filter((user) => user.role !== "VISITOR")
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.username}{user.name ? ` (${user.name})` : ''} · {user.role}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Messages */}
              {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
                  }`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <span className="text-sm font-medium">{status.message}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProjectId}
                  className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="p-6 space-y-6">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium italic">Prêt à créer un nouvel ouvrage. Remplissez les champs ci-dessous.</span>
              </div>

              {/* Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nom du projet *</label>
                  <input
                    type="text"
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    placeholder="Nom de l'ouvrage"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Pays *</label>
                  <input
                    type="text"
                    value={createFormData.country}
                    onChange={(e) => setCreateFormData({ ...createFormData, country: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    placeholder="ex: Sierra Leone"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type de projet *</label>
                  <select
                    value={createFormData.type}
                    onChange={(e) => setCreateFormData({ ...createFormData, type: e.target.value as unknown as ProjectType })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    required
                  >
                    {Object.values(ProjectType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Statut *</label>
                  <div className="flex items-center gap-3">
                    <select
                      value={createFormData.status}
                      onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value as unknown as ProjectStatus })}
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                      required
                    >
                      {Object.values(ProjectStatus).map(s => (
                        <option key={s} value={s}>
                          {getStatusLabel(s)}
                        </option>
                      ))}
                    </select>
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 flex items-center justify-center p-1.5 shrink-0">
                      <NextImage
                        src={createFormData.pinName && (createFormData.pinName.startsWith('http') || createFormData.pinName.startsWith('/'))
                          ? createFormData.pinName
                          : (createFormData.status === 'DONE' ? 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/realise.png'
                            : createFormData.status === 'CURRENT' ? 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/en_cours.png'
                            : 'https://pub-78c42489fd854dc3a6975810aa00edf2.r2.dev/pins/prospection.png')}
                        alt="Pin"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Code Projet</label>
                  <input
                    type="text"
                    value={createFormData.projectCode}
                    onChange={(e) => setCreateFormData({ ...createFormData, projectCode: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white"
                    placeholder="ex: SLE-2024-001"
                  />
                </div>
              </div>

              {/* Carte Interactive */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" /> Position Géo-référencée
                </label>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-sm h-[300px]">
                  <EditableMapWrapper
                    latitude={createFormData.latitude}
                    longitude={createFormData.longitude}
                    onPositionChange={handleMapPositionChange}
                    status={createFormData.status}
                    customPinUrl={createFormData.pinName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> Latitude
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" /> Longitude
                  </label>
                </div>
              </div>

              {/* Ligne des inputs Coordonnées avec Undo/Redo pour Création */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-center">
                <input
                  type="text"
                  value={coordinateFormat === 'decimal' ? (createFormData.latitude ?? 0) : decimalToDMS(createFormData.latitude ?? 0, true)}
                  onChange={(e) => {
                    try {
                      const val = coordinateFormat === 'dms' ? dmsToDecimal(e.target.value) : parseFloat(e.target.value) || 0;
                      setCreateFormData(prev => ({ ...prev, latitude: val }));
                      setPositionHistory(h => [...h.slice(0, historyIndex + 1), { lat: val, lng: createFormData.longitude ?? 0 }].slice(-50));
                      setHistoryIndex(prev => Math.min(prev + 1, 49));
                      setStatus(null);
                    } catch {
                      setStatus({ type: 'error', message: `Format ${coordinateFormat === 'dms' ? 'DMS' : 'décimal'} invalide` });
                    }
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-mono text-sm"
                  placeholder="Latitude"
                  required
                />
                <input
                  type="text"
                  value={coordinateFormat === 'decimal' ? (createFormData.longitude ?? 0) : decimalToDMS(createFormData.longitude ?? 0, false)}
                  onChange={(e) => {
                    try {
                      const val = coordinateFormat === 'dms' ? dmsToDecimal(e.target.value) : parseFloat(e.target.value) || 0;
                      setCreateFormData(prev => ({ ...prev, longitude: val }));
                      setPositionHistory(h => [...h.slice(0, historyIndex + 1), { lat: createFormData.latitude ?? 0, lng: val }].slice(-50));
                      setHistoryIndex(prev => Math.min(prev + 1, 49));
                      setStatus(null);
                    } catch {
                      setStatus({ type: 'error', message: `Format ${coordinateFormat === 'dms' ? 'DMS' : 'décimal'} invalide` });
                    }
                  }}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white font-mono text-sm"
                  placeholder="Longitude"
                  required
                />
                <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800 shadow-sm">
                  {/* Format Toggle Button - Unique per row */}
                  <button
                    type="button"
                    onClick={() => setCoordinateFormat(prev => prev === 'decimal' ? 'dms' : 'decimal')}
                    className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1.5"
                    title={coordinateFormat === 'decimal' ? "Passer en DMS" : "Passer en Décimal"}
                  >
                    {coordinateFormat === 'decimal' ? <MapPin className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    <span className="text-[10px] font-bold uppercase">{coordinateFormat === 'decimal' ? 'DMS' : 'DEC'}</span>
                  </button>

                  <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 transition-all"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= positionHistory.length - 1}
                    className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 transition-all"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ligne des exemples pour Création */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-1 md:-mt-2 px-1">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                  {coordinateFormat === 'decimal' ? 'Ex: 8.4657' : 'Ex: 8° 27\' 56" N'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                  {coordinateFormat === 'decimal' ? 'Ex: -13.2317' : 'Ex: 13° 13\' 54" W'}
                </p>
              </div>


              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-gray-400" /> Description du projet
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white resize-none"
                  placeholder="Détails de l'ouvrage..."
                />
              </div>

              {/* Avancement */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avancement initial du Projet</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { label: "Prospection", key: "prospection" },
                    { label: "Études", key: "studies" },
                    { label: "Fabrication", key: "fabrication" },
                    { label: "Transport", key: "transport" },
                    { label: "Montage", key: "construction" },
                  ].map((step) => (
                    <div key={step.key}>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{step.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={createFormData[step.key as keyof typeof createFormData] === 0 ? "" : createFormData[step.key as keyof typeof createFormData]}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || value === "0") {
                            setCreateFormData({ ...createFormData, [step.key]: 0 });
                          } else {
                            // Supprimer les zéros en début de chaîne
                            const cleanValue = value.replace(/^0+/, "") || "0";
                            const numValue = parseInt(cleanValue, 10);
                            if (!isNaN(numValue)) {
                              setCreateFormData({ ...createFormData, [step.key]: Math.min(100, Math.max(0, numValue)) });
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Identite Visuelle */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> Identite Visuelle
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Drapeau */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Drapeau du Pays
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                        {createFormData.flagName ? (
                          <NextImage
                            src={createFormData.flagName.startsWith('http') || createFormData.flagName.startsWith('/') ? createFormData.flagName : `/${createFormData.flagName}`}
                            alt="Drapeau"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        )}
                        <button
                          type="button"
                          onClick={() => setIsFlagPickerOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          Choisir
                        </button>
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setIsFlagPickerOpen(true)}
                          className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 transition-all text-xs text-gray-500 dark:text-gray-400 truncate"
                        >
                          {createFormData.flagName ? createFormData.flagName.split('/').pop() : "Selectionner une image..."}
                        </button>
                        {createFormData.flagName && (
                          <button
                            type="button"
                            onClick={() => setCreateFormData({ ...createFormData, flagName: "" })}
                            className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Logo Client */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Logo Client
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="relative group w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0 shadow-sm">
                        {createFormData.clientLogoName ? (
                          <NextImage
                            src={createFormData.clientLogoName.startsWith('http') || createFormData.clientLogoName.startsWith('/') ? createFormData.clientLogoName : `/${createFormData.clientLogoName}`}
                            alt="Logo"
                            fill
                            className="object-contain p-2"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        )}
                        <button
                          type="button"
                          onClick={() => setIsLogoPickerOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest"
                        >
                          Choisir
                        </button>
                      </div>
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={() => setIsLogoPickerOpen(true)}
                          className="w-full px-4 py-2 text-left bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-indigo-400 transition-all text-xs text-gray-500 dark:text-gray-400 truncate"
                        >
                          {createFormData.clientLogoName ? createFormData.clientLogoName.split('/').pop() : "Selectionner une image..."}
                        </button>
                        {createFormData.clientLogoName && (
                          <button
                            type="button"
                            onClick={() => setCreateFormData({ ...createFormData, clientLogoName: "" })}
                            className="text-[10px] text-red-500 font-bold uppercase mt-1 ml-1 hover:underline"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accès et Affectation */}
              <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  Accès et Affectation
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Affectation à un utilisateur */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Affecter à un utilisateur
                    </label>
                    <select
                      value={createFormData.assignToUserId}
                      onChange={(e) => setCreateFormData({ ...createFormData, assignToUserId: e.target.value, createUserIfNotExists: false })}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                    >
                      <option value="">— Moi-même (par défaut) —</option>
                      {allUsers
                        .filter((user) => user.role !== "VISITOR")
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.username}{user.name ? ` (${user.name})` : ''} · {user.role}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Visibilité pour Création */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Eye className="w-3 h-3" /> Visibilité
                    </label>
                    <select
                      value={createFormData.visible ? "true" : "false"}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, visible: e.target.value === "true" }))}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                    >
                      <option value="true">Visible (Public)</option>
                      <option value="false">Masqué (Privé)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Phase 3: File Upload */}\r\n
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-500" /> Documents et Photos (Optionnel)
                </h3>
                <FileUploadZone
                  onFilesSelected={handleFilesSelected}
                  disabled={isSubmitting || isUploading}
                />
                <FileUploadProgress
                  uploads={uploads}
                  onRemove={(index) => setUploads(prev => prev.filter((_, i) => i !== index))}
                  onClearCompleted={() => setUploads([])}
                />
              </div>



              {/* Status Messages */}
              {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
                  }`}>
                  {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                  <span className="text-sm font-medium">{status.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('modify')}
                  className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Créer le projet
                </button>
              </div>
            </form>
          )
          }

          {
            activeTab === 'delete' && (
              <div className="p-6 space-y-6">
                <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">Zone de danger : Suppression de projet</span>
                    <span className="text-xs">Cette action est irréversible. Toutes les données et fichiers associés seront définitivement supprimés.</span>
                  </div>
                </div>

                {/* Filtre pays, Sélection du projet à supprimer */}
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Filtre par pays */}
                  <div className="flex-1 md:flex-[0.3]">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Filtrer par pays</label>
                    <select
                      value={countryFilter}
                      onChange={(e) => {
                        setCountryFilter(e.target.value);
                        setSelectedProjectId(""); // Réinitialiser la sélection
                      }}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                    >
                      <option value="Tous">Tous les pays</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 md:flex-[0.35]">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Choisir le projet</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                    >
                      <option value="">
                        {sortedProjects.length === 0 ? "Aucun projet" : "-- Sélectionner --"}
                      </option>
                      {sortedProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 md:flex-[0.35] relative">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Recherche rapide</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="Tapez le nom..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                      {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute z-[110] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-auto animate-in fade-in slide-in-from-top-2 duration-200">
                          {searchSuggestions.map((project: Project) => (
                            <button
                              key={project.id}
                              type="button"
                              onClick={() => handleSearchSelect(project)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <span className="font-semibold">{project.name}</span>
                              <span className="ml-2 text-xs opacity-60">({project.country})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedProjectId && (
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Récapitulatif du projet</h3>

                    {(() => {
                      const project = projects.find(p => p.id === selectedProjectId);
                      if (!project) return null;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase font-bold">Nom de l&apos;ouvrage</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500 uppercase font-bold">Pays</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{project.country}</p>
                          </div>
                          <div className="space-y-1 text-red-600 dark:text-red-400">
                            <p className="text-xs uppercase font-bold opacity-70">Attention</p>
                            <p className="text-sm font-medium italic">Tous les documents et photos seront supprimés.</p>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Veuillez taper <span className="text-red-600 dark:text-red-400 font-mono">&quot;{projects.find(p => p.id === selectedProjectId)?.name}&quot;</span> pour confirmer la suppression :
                      </label>
                      <input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder="Nom du projet..."
                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-900/30 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all dark:text-white font-medium"
                      />
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProjectId('');
                          setConfirmName('');
                        }}
                        className="px-6 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || confirmName !== projects.find(p => p.id === selectedProjectId)?.name}
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Suppression...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Supprimer définitivement
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          }

          {/* Pickers - Global */}
          <DatabaseImagePicker
            isOpen={isFlagPickerOpen}
            onClose={() => setIsFlagPickerOpen(false)}
            initialProjectFilter="project-flags"
            onSelect={(url) => {
              if (activeTab === 'create') {
                setCreateFormData({ ...createFormData, flagName: url });
              } else {
                setFormData({ ...formData, flagName: url });
              }
              setIsFlagPickerOpen(false);
            }}
          />
          <DatabaseImagePicker
            isOpen={isLogoPickerOpen}
            onClose={() => setIsLogoPickerOpen(false)}
            initialProjectFilter="project-clients"
            onSelect={(url) => {
              if (activeTab === 'create') {
                setCreateFormData({ ...createFormData, clientLogoName: url });
              } else {
                setFormData({ ...formData, clientLogoName: url });
              }
              setIsLogoPickerOpen(false);
            }}
          />

          <DatabaseImagePicker
            isOpen={isPinPickerOpen}
            onClose={() => setIsPinPickerOpen(false)}
            initialProjectFilter="project-pins"
            onSelect={(url) => {
              if (activeTab === 'create') {
                setCreateFormData({ ...createFormData, pinName: url });
              } else {
                setFormData({ ...formData, pinName: url });
              }
              setIsPinPickerOpen(false);
            }}
          />

        </div >
      </div >

      {/* Toast Notification */}
      {
        toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
            duration={5000}
          />
        )
      }
    </div >
  );
}
