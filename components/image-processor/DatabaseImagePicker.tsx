'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, X, Search } from 'lucide-react';
import { FileGrid } from '@/components/files/file-grid';
import { FileSearch } from '@/components/files/file-search';
import { FileData } from '@/components/files/file-explorer';
import { FilePreviewModal } from '@/components/files/file-preview-modal';
import { FileContextMenu } from '@/components/files/file-context-menu';
import { FileMoveDialog } from '@/components/files/file-move-dialog';
import { FileDeleteDialog } from '@/components/files/file-delete-dialog';

interface DatabaseImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string, filename: string) => void;
}

export function DatabaseImagePicker({ isOpen, onClose, onSelect }: DatabaseImagePickerProps) {
    const [allFiles, setAllFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState('ALL');
    const [countryFilter, setCountryFilter] = useState('Tous');
    const [projectFilter, setProjectFilter] = useState('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Context Menu & Action States
    const [renamingFile, setRenamingFile] = useState<FileData | null>(null);
    const [newName, setNewName] = useState("");
    const [previewFile, setPreviewFile] = useState<FileData | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileData } | null>(null);
    const [moveFileIds, setMoveFileIds] = useState<string[] | null>(null);
    const [deleteFileIds, setDeleteFileIds] = useState<string[] | null>(null);

    // Fetch files when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchFiles();
            resetFilters();
        }
    }, [isOpen]);

    const resetFilters = () => {
        setSelectedId(null);
        setSearchQuery('');
        setFileTypeFilter('ALL');
        setCountryFilter('Tous');
        setProjectFilter('ALL');
    };

    const fetchFiles = async () => {
        setLoading(true);
        try {
            // Fetch more files to allow proper filtering
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

    // Auto-select country when project is selected (logic from FileExplorer)
    useEffect(() => {
        if (projectFilter !== "ALL" && projectFilter !== "ORPHANED") {
            const projectFile = allFiles.find(f => f.project?.id === projectFilter);
            if (projectFile?.project?.country) {
                setCountryFilter(projectFile.project.country);
            }
        }
    }, [projectFilter, allFiles]);

    // Apply exact same filtering logic as FileExplorer + restrict to IMAGE
    const filteredFiles = allFiles.filter(f => {
        // MUST BE IMAGE for this specific picker
        if (f.fileType !== 'IMAGE') return false;

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

        // Filter by type (even if we force IMAGE above, the user requested the filter UI)
        if (fileTypeFilter !== "ALL" && f.fileType !== fileTypeFilter) {
            return false;
        }

        return true;
    });

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const file = allFiles.find(f => f.id === id);
        if (file) {
            setContextMenu({ x: e.clientX, y: e.clientY, file });
        }
    }, [allFiles]);

    const startRename = (file: FileData) => {
        setRenamingFile(file);
        setNewName(file.name);
    };

    const handleRenameSubmit = async () => {
        if (!renamingFile || !newName || newName === renamingFile.name) {
            setRenamingFile(null);
            return;
        }

        try {
            const res = await fetch(`/api/files/${renamingFile.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName }),
            });

            if (!res.ok) throw new Error("Rename failed");

            fetchFiles();
        } catch (error) {
            console.error("Rename error:", error);
            alert("Erreur lors du renommage");
        } finally {
            setRenamingFile(null);
        }
    };

    const handleMove = async (targetProjectId: string) => {
        if (!moveFileIds) return;

        try {
            await Promise.all(moveFileIds.map(id =>
                fetch(`/api/files/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId }),
                })
            ));

            fetchFiles();
            setMoveFileIds(null);
        } catch (error) {
            console.error("Move error:", error);
            alert("Erreur lors du déplacement");
        }
    };

    const handleDelete = async (permanent: boolean = false) => {
        if (!deleteFileIds) return;

        try {
            const res = await fetch("/api/files/delete", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileIds: deleteFileIds, permanent }),
            });

            if (!res.ok) throw new Error("Delete failed");

            setSelectedId(null);
            fetchFiles();
            setDeleteFileIds(null);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Erreur lors de la suppression");
        }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative bg-white dark:bg-gray-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">

                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">
                            <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">Bibliothèque d'Images</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Sélectionnez une image pour traitement</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Advanced Search Toolbar */}
                <div className="p-5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <FileSearch
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        fileTypeFilter={fileTypeFilter}
                        onFilterChange={setFileTypeFilter}
                        countryFilter={countryFilter}
                        onCountryChange={setCountryFilter}
                        projectFilter={projectFilter}
                        onProjectChange={setProjectFilter}
                        files={allFiles} // Pass all for filter menus
                        onFileSelect={(file) => {
                            setSearchQuery(file.name);
                            setSelectedId(file.id);
                        }}
                    />
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-950/20 custom-scrollbar relative">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center h-full gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                            <p className="text-sm font-medium text-gray-500 animate-pulse">Chargement de la bibliothèque...</p>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                            <Search className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">Aucune image ne correspond aux critères</p>
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
                            onRename={startRename}
                            onPreview={setPreviewFile}
                            onContextMenu={handleContextMenu}
                        />
                    )}

                    {/* Rename Modal (Inline absolute) */}
                    {renamingFile && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                                <h3 className="text-lg font-bold mb-4 dark:text-white">Renommer l'image</h3>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full p-3 border rounded-xl mb-6 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenameSubmit();
                                        if (e.key === "Escape") setRenamingFile(null);
                                    }}
                                />
                                <div className="flex justify-end gap-3">
                                    <Button
                                        onClick={() => setRenamingFile(null)}
                                        variant="ghost"
                                        className="text-xs font-bold uppercase tracking-widest"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        onClick={handleRenameSubmit}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest px-6"
                                    >
                                        Sauvegarder
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
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
                        Importer cette image
                    </button>
                </div>
            </div>

            {/* Dialogs & Overlays */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={() => setContextMenu(null)}
                    onPreview={() => setPreviewFile(contextMenu.file)}
                    onRename={() => startRename(contextMenu.file)}
                    onMove={() => setMoveFileIds([contextMenu.file.id])}
                    onDelete={() => setDeleteFileIds([contextMenu.file.id])}
                />
            )}

            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    files={filteredFiles}
                    onClose={() => setPreviewFile(null)}
                    onNavigate={setPreviewFile}
                />
            )}

            {moveFileIds && (
                <FileMoveDialog
                    fileIds={moveFileIds}
                    currentProjectId={allFiles.find(f => f.id === moveFileIds[0])?.projectId || null}
                    onClose={() => setMoveFileIds(null)}
                    onMove={handleMove}
                />
            )}

            {deleteFileIds && (
                <FileDeleteDialog
                    fileCount={deleteFileIds.length}
                    onClose={() => setDeleteFileIds(null)}
                    onConfirm={handleDelete}
                />
            )}
        </div>
    );
}
