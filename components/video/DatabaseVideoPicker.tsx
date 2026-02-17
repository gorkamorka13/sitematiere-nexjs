'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Video, Loader2 } from 'lucide-react';
import { FileGrid } from '@/components/files/file-grid';
import { FileSearch } from '@/components/files/file-search';
import { FileData } from '@/components/files/file-explorer';
import { FilePreviewModal } from '@/components/files/file-preview-modal';

interface DatabaseVideoPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (videoUrl: string, filename: string) => void;
    initialProjectFilter?: string;
}

export function DatabaseVideoPicker({ isOpen, onClose, onSelect, initialProjectFilter }: DatabaseVideoPickerProps) {
    const [allFiles, setAllFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [countryFilter, setCountryFilter] = useState('Tous');
    const [projectFilter, setProjectFilter] = useState(initialProjectFilter || 'ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<FileData | null>(null);

    const resetFilters = useCallback(() => {
        setSelectedId(null);
        setSearchQuery('');
        setCountryFilter('Tous');
        setProjectFilter(initialProjectFilter || 'ALL');
    }, [initialProjectFilter]);

    // Fetch files when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchFiles();
            resetFilters();
        }
    }, [isOpen, resetFilters]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/files/list?limit=500');
            if (res.ok) {
                const data = await res.json();
                setAllFiles(data.files || []);
            }
        } catch (error) {
            console.error("Failed to fetch files", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-select country when project is selected
    useEffect(() => {
        if (projectFilter !== "ALL" && projectFilter !== "ORPHANED") {
            const projectFile = allFiles.find(f => f.project?.id === projectFilter);
            if (projectFile?.project?.country) {
                setCountryFilter(projectFile.project.country);
            }
        }
    }, [projectFilter, allFiles]);

    // Filter logic
    const filteredFiles = allFiles.filter(f => {
        // MUST BE VIDEO
        if (f.fileType !== 'VIDEO') return false;

        // Filter by search query
        if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Filter by project
        if (projectFilter !== "ALL") {
            if (projectFilter === "ORPHANED") {
                if (f.project) return false;
            } else {
                if (f.project?.id !== projectFilter) return false;
            }
        }

        // Filter by country
        if (countryFilter !== "Tous") {
            if (countryFilter === "Autre") {
                return !f.project?.country;
            }
            return f.project?.country === countryFilter;
        }

        return true;
    });

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleConfirm = () => {
        if (selectedId) {
            const file = allFiles.find(f => f.id === selectedId);
            if (file) {
                onSelect(file.blobUrl, file.name);
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">
                            <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Bibliothèque Vidéo</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Sélectionnez une vidéo pour le projet</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <FileSearch
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        fileTypeFilter="VIDEO" // Locked to VIDEO
                        onFilterChange={() => {}} // Disable changing file type
                        countryFilter={countryFilter}
                        onCountryChange={setCountryFilter}
                        projectFilter={projectFilter}
                        onProjectChange={setProjectFilter}
                        files={allFiles}
                        onFileSelect={(file) => {
                            setSearchQuery(file.name);
                            setSelectedId(file.id);
                        }}
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-950/20 custom-scrollbar relative">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-full gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                            <p className="text-sm font-medium text-gray-500 animate-pulse">Chargement de la bibliothèque...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                            <Video className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aucune vidéo trouvée</p>
                            <Button
                                variant="link"
                                onClick={resetFilters}
                                className="text-indigo-600 mt-2"
                            >
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    ) : (
                        <FileGrid
                            files={filteredFiles}
                            selectedIds={new Set(selectedId ? [selectedId] : [])}
                            onSelect={(id) => handleSelect(id)}
                            onPreview={setPreviewFile}
                            // No context menu needed for picker usually, or keep it simple
                        />
                    )}
                </div>

                <div className="p-5 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <Button variant="ghost" onClick={onClose} className="font-bold uppercase tracking-widest text-xs">
                        Annuler
                    </Button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg
                            ${!selectedId
                                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 active:scale-95 shadow-gray-200 dark:shadow-none'}
                        `}
                    >
                        Importer cette vidéo
                    </button>
                </div>
            </div>

            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    files={filteredFiles}
                    onClose={() => setPreviewFile(null)}
                    onNavigate={setPreviewFile}
                />
            )}
        </div>
    );
}
