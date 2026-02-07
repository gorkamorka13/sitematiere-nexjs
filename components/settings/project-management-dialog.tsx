"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Save, MapPin, AlignLeft, FolderOpen, AlertCircle, CheckCircle2, Globe, Search, Undo2, Redo2 } from "lucide-react";
import { Project, Document as ProjectDocument } from "@prisma/client";
import { updateProject } from "@/app/actions/project-actions";
import EditableMapWrapper from "@/components/ui/editable-map-wrapper";
import { decimalToDMS, dmsToDecimal, isValidLatitude, isValidLongitude } from "@/lib/coordinate-utils";

interface ProjectManagementDialogProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
}

export default function ProjectManagementDialog({ projects, isOpen, onClose, isAdmin }: ProjectManagementDialogProps) {
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
  });
  const [coordinateFormat, setCoordinateFormat] = useState<'decimal' | 'dms'>('decimal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = useState(-1);

  // Historique des positions pour undo/redo
  const [positionHistory, setPositionHistory] = useState<{ lat: number; lng: number }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedo, setIsUndoRedo] = useState(false);

  // Handle dialog dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle map marker position change
  const handleMapPositionChange = (lat: number, lng: number, isFinal?: boolean) => {
    // Si c'est un undo/redo, ne pas ajouter à l'historique
    if (isUndoRedo) {
      setIsUndoRedo(false);
      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
      return;
    }

    // Mettre à jour le formulaire dans tous les cas
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));

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
      setIsUndoRedo(true);
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const pos = positionHistory[newIndex];
      if (pos) {
        setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
      }
    }
  }, [historyIndex, positionHistory]);

  // Fonction Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < positionHistory.length - 1) {
      setIsUndoRedo(true);
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const pos = positionHistory[newIndex];
      if (pos) {
        setFormData(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
      }
    }
  }, [historyIndex, positionHistory]);

  // Initialiser l'historique quand on sélectionne un projet
  useEffect(() => {
    if (selectedProjectId) {
      // Attendre que formData soit mis à jour avec les valeurs du projet
      const timer = setTimeout(() => {
        if (formData.latitude !== 0 && formData.longitude !== 0) {
          setPositionHistory([{ lat: formData.latitude, lng: formData.longitude }]);
          setHistoryIndex(0);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

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
      const newLat = field === 'latitude' ? decimal : formData.latitude;
      const newLng = field === 'longitude' ? decimal : formData.longitude;

      setFormData(prev => ({
        ...prev,
        [field]: decimal
      }));

      // Ajouter à l'historique si ce n'est pas un undo/redo
      if (!isUndoRedo) {
        setPositionHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push({ lat: newLat, lng: newLng });
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          return newHistory;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 49));
      } else {
        setIsUndoRedo(false);
      }
    } catch (err) {
      // Invalid format, don't update
      setStatus({ type: 'error', message: `Format ${coordinateFormat === 'dms' ? 'DMS' : 'décimal'} invalide` });
    }
  };

  // Logic de recherche
  const sortedProjects = (projects || []).slice().sort((a, b) => a.name.localeCompare(b.name));

  const searchSuggestions = (projects || []).filter(p =>
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
        const flagDoc = project.documents?.find((d) => d.type === "FLAG");
        const logoDoc = project.documents?.find((d) => d.type === "CLIENT_LOGO" || d.name.toLowerCase().includes('logo'));

        setFormData({
          latitude: project.latitude,
          longitude: project.longitude,
          description: project.description || "",
          prospection: project.prospection || 0,
          studies: project.studies || 0,
          fabrication: project.fabrication || 0,
          transport: project.transport || 0,
          construction: project.construction || 0,
          flagName: flagDoc?.url || "",
          clientLogoName: logoDoc?.url || "",
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
        });
    }
  }, [selectedProjectId, projects]);

  if (!isOpen || !isAdmin) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await updateProject({
        id: selectedProjectId,
        latitude: formData.latitude,
        longitude: formData.longitude,
        description: formData.description,
      });

      if (result.success) {
        setStatus({ type: 'success', message: "Projet mis à jour avec succès !" });
        setTimeout(() => {
            // Optionnel: On peut rester ouvert ou fermer
            // onClose();
        }, 2000);
      } else {
        setStatus({ type: 'error', message: result.error || "Une erreur est survenue." });
      }
    } catch (error) {
      setStatus({ type: 'error', message: "Erreur de communication avec le serveur." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 lg:p-4 animate-in fade-in duration-300">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-100 dark:border-gray-700 transition-all animate-in fade-in zoom-in duration-200 flex flex-col"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      >
        {/* Header - Draggable */}
        <div
          className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">
                <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Gestion des Projets</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Sélection du projet et Recherche Rapide */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 md:flex-[0.4]">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Choisir un projet</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  // On ne synchronise plus searchQuery ici pour le laisser vide
                }}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all dark:text-white"
                required
              >
                <option value="">-- Sélectionner --</option>
                {sortedProjects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.country})</option>
                ))}
              </select>
            </div>

            <div className="flex-1 md:flex-[0.6] relative">
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
                        className={`w-full text-left px-4 py-2 text-sm transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                          focusedSuggestionIndex === index
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" /> Latitude
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setCoordinateFormat('decimal')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      coordinateFormat === 'decimal'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Format décimal"
                  >
                    <Globe className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinateFormat('dms')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      coordinateFormat === 'dms'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Format DMS (Degrés, Minutes, Secondes)"
                  >
                    <MapPin className="w-3 h-3" />
                  </button>
                </div>
              </label>
            </div>

            {/* Label Longitude */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" /> Longitude
                </span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setCoordinateFormat('decimal')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      coordinateFormat === 'decimal'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Format décimal"
                  >
                    <Globe className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoordinateFormat('dms')}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                      coordinateFormat === 'dms'
                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title="Format DMS (Degrés, Minutes, Secondes)"
                  >
                    <MapPin className="w-3 h-3" />
                  </button>
                </div>
              </label>
            </div>
          </div>

          {/* Ligne des inputs avec boutons Undo/Redo */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            {/* Input Latitude */}
            <div>
              <input
                type="text"
                value={coordinateFormat === 'decimal' ? formData.latitude : decimalToDMS(formData.latitude, true)}
                onChange={(e) => handleCoordinateChange(e.target.value, 'latitude')}
                disabled={!selectedProjectId}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all dark:text-white font-mono text-sm"
                placeholder={coordinateFormat === 'decimal' ? '8.4657' : '8° 27\' 56" N'}
                required
              />
            </div>

            {/* Boutons Undo/Redo centraux */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800 shadow-sm">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0 || !selectedProjectId}
                  className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  title="Annuler (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= positionHistory.length - 1 || !selectedProjectId}
                  className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1"
                  title="Rétablir (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">Redo</span>
                </button>
              </div>
            </div>

            {/* Input Longitude */}
            <div>
              <input
                type="text"
                value={coordinateFormat === 'decimal' ? formData.longitude : decimalToDMS(formData.longitude, false)}
                onChange={(e) => handleCoordinateChange(e.target.value, 'longitude')}
                disabled={!selectedProjectId}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-all dark:text-white font-mono text-sm"
                placeholder={coordinateFormat === 'decimal' ? '-13.2317' : '13° 13\' 54" W'}
                required
              />
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

          {/* Avancement du Chantier */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-500" /> Avancement du Chantier
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
                    value={formData[step.key as keyof typeof formData]}
                    onChange={(e) => setFormData({ ...formData, [step.key]: parseInt(e.target.value) || 0 })}
                    disabled={!selectedProjectId}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Identité Visuelle */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <FolderOpen className="w-4 h-4" /> Identité Visuelle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Drapeau */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  Drapeau
                  {selectedProjectId && formData.flagName && (
                    <img
                      src={`/${formData.flagName}`}
                      alt="Drapeau"
                      className="w-8 h-6 object-cover rounded shadow-sm ml-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </label>
                <input
                  type="text"
                  value={formData.flagName}
                  onChange={(e) => setFormData({ ...formData, flagName: e.target.value })}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                  placeholder="ex: images/flags/sierra-leone.png"
                />
              </div>
              {/* Logo Client */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  Logo Client
                  {selectedProjectId && formData.clientLogoName && (
                    <img
                      src={`/${formData.clientLogoName}`}
                      alt="Logo client"
                      className="h-6 w-auto object-contain ml-auto"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </label>
                <input
                  type="text"
                  value={formData.clientLogoName}
                  onChange={(e) => setFormData({ ...formData, clientLogoName: e.target.value })}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all dark:text-white text-sm"
                  placeholder="ex: images/logos/slra.png"
                />
              </div>
            </div>
          </div>

          {/* Status Messages */}
          {status && (
            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              status.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'
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
      </div>
    </div>
  );
}
