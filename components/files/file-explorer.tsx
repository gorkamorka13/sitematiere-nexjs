"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FileSearch } from "./file-search";
import { FileToolbar } from "./file-toolbar";
import { FileGrid } from "./file-grid";
import { FileList } from "./file-list";
import { FilePreviewModal } from "./file-preview-modal";
import { FileContextMenu } from "./file-context-menu";
import { FileMoveDialog } from "./file-move-dialog";
import { FileDeleteDialog } from "./file-delete-dialog";
import { FileType } from "@/lib/enums";
import { Toast, ToastType } from "@/components/ui/toast";

import { useDebounce } from "@/hooks/use-debounce";

export interface FileData {
    id: string;
    name: string;
    blobUrl: string;
    blobPath: string;
    thumbnailUrl: string | null;
    fileType: FileType;
    size: number;
    mimeType: string;
    createdAt: string | Date;
    projectId: string | null;
    project?: {
        id: string;
        name: string;
        country: string;
    } | null;
}

export function FileExplorer() {
    // State declarations MUST come before any computed values that use them
    const [allFiles, setAllFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearchQuery = useDebounce(searchQuery, 300);
    const [fileTypeFilter, setFileTypeFilter] = useState("ALL");
    const [countryFilter, setCountryFilter] = useState("Tous");
    const [projectFilter, setProjectFilter] = useState("ALL"); // New Project Filter State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'fileType' | 'size' | 'createdAt'; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Auto-select country when project is selected
    useEffect(() => {
        if (projectFilter !== "ALL" && projectFilter !== "ORPHANED") {
            const projectFile = allFiles.find((f: FileData) => f.project?.id === projectFilter);
            if (projectFile?.project?.country) {
                setCountryFilter(projectFile.project.country);
            }
        }
    }, [projectFilter, allFiles]);


    // Derived state for display
    // The sorting is still done client side for immediate feedback on the current "page"
    // Since limit is 1200, it's effectively all files for most cases anyway.
    const files = useMemo(() => {
        return [...allFiles].sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;

            let valA = a[key];
            let valB = b[key];

            if (key === 'createdAt') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [allFiles, sortConfig]);

    const toggleSort = (key: 'name' | 'fileType' | 'size' | 'createdAt') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();

            if (fileTypeFilter !== "ALL") params.append("fileType", fileTypeFilter);
            if (projectFilter !== "ALL") params.append("projectId", projectFilter);
            if (countryFilter !== "Tous") params.append("country", countryFilter);
            if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);

            const res = await fetch(`/api/files/list?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch files");

            const data = await res.json();
            setAllFiles(data.files || []);

        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    }, [fileTypeFilter, projectFilter, countryFilter, debouncedSearchQuery]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles, refreshTrigger]);

    const [renamingFile, setRenamingFile] = useState<FileData | null>(null);
    const [newName, setNewName] = useState("");
    const [previewFile, setPreviewFile] = useState<FileData | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileData } | null>(null);

    // Dialog States
    const [moveFileIds, setMoveFileIds] = useState<string[] | null>(null);
    const [deleteFileIds, setDeleteFileIds] = useState<string[] | null>(null);

    const handleSelect = useCallback((id: string, multi: boolean, forceToggle: boolean = false) => {
        const newSelection = new Set((multi || forceToggle) ? selectedIds : []);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    }, [selectedIds]);

    const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const file = files.find((f: FileData) => f.id === id);
        if (file) {
            // If the file is not selected, select only it (unless Ctrl is held)
            if (!selectedIds.has(id)) {
                handleSelect(id, e.ctrlKey || e.metaKey);
            }
            setContextMenu({ x: e.clientX, y: e.clientY, file });
        }
    }, [files, selectedIds, handleSelect]);

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

            setToast({ message: "Fichier renommé avec succès", type: "success" });
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Rename error:", error);
            setToast({ message: "Erreur lors du renommage", type: "error" });
        } finally {
            setRenamingFile(null);
        }
    };

    const handleMove = async (targetProjectId: string) => {
        if (!moveFileIds) return;

        try {
            const res = await fetch("/api/files/bulk-move", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileIds: moveFileIds, projectId: targetProjectId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Move failed");
            }

            setToast({ message: `${moveFileIds.length} fichier(s) déplacé(s) avec succès`, type: "success" });
            setRefreshTrigger(prev => prev + 1);
            setMoveFileIds(null);
            setSelectedIds(new Set());
        } catch (error) {
            console.error("Move error:", error);
            setToast({
                message: error instanceof Error ? error.message : "Erreur lors du déplacement",
                type: "error"
            });
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

            setToast({ message: `${deleteFileIds.length} fichier(s) supprimé(s) avec succès`, type: "success" });
            setSelectedIds(new Set());
            setRefreshTrigger(prev => prev + 1);
            setDeleteFileIds(null);
        } catch (error) {
            console.error("Delete error:", error);
            setToast({ message: "Erreur lors de la suppression", type: "error" });
        }
    };

    // Toolbar delete action (bulk)
    const onToolbarDelete = () => {
        if (selectedIds.size > 0) {
            setDeleteFileIds(Array.from(selectedIds));
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col space-y-4 bg-background z-10">
                <FileSearch
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    fileTypeFilter={fileTypeFilter}
                    onFilterChange={setFileTypeFilter}
                    countryFilter={countryFilter}
                    onCountryChange={setCountryFilter}
                    projectFilter={projectFilter}
                    onProjectChange={setProjectFilter}
                    files={allFiles}
                    onFileSelect={(file) => {
                        setSearchQuery(file.name);
                        // Optional: trigger preview? user just said "positionner/afficher".
                        // Setting search query effectively isolates it.
                        // We could also scroll to it if we had refs.
                    }}
                />

                <FileToolbar
                    selectedCount={selectedIds.size}
                    viewMode={viewMode}
                    onViewChange={setViewMode}
                    onMove={() => setMoveFileIds(Array.from(selectedIds))}
                    onDelete={onToolbarDelete}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                    isRefreshing={loading}
                />
            </div>

            <div className="flex-1 min-h-0 bg-muted/10 rounded-lg border relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                )}

                {viewMode === "grid" ? (
                    <FileGrid
                        files={files}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onRename={startRename}
                        onPreview={setPreviewFile}
                        onContextMenu={handleContextMenu}
                    />
                ) : (
                    <FileList
                        files={files}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onRename={startRename}
                        onPreview={setPreviewFile}
                        onContextMenu={handleContextMenu}
                        sortConfig={sortConfig}
                        onSort={toggleSort}
                    />
                )}

                {!loading && files.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                        <p>Aucun fichier</p>
                    </div>
                )}

                {/* Rename Modal (Simple inline absolute centered for now) */}
                {renamingFile && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-sm border">
                            <h3 className="text-lg font-semibold mb-4">Renommer le fichier</h3>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full p-2 border rounded mb-4 focus:ring-2 focus:ring-primary outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleRenameSubmit();
                                    if (e.key === "Escape") setRenamingFile(null);
                                }}
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setRenamingFile(null)}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleRenameSubmit}
                                    className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium"
                                >
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    file={contextMenu.file}
                    onClose={() => setContextMenu(null)}
                    onPreview={() => setPreviewFile(contextMenu.file)}
                    onRename={() => startRename(contextMenu.file)}
                    onMove={() => {
                        if (selectedIds.has(contextMenu.file.id)) {
                            setMoveFileIds(Array.from(selectedIds));
                        } else {
                            setMoveFileIds([contextMenu.file.id]);
                        }
                    }}
                    onDelete={() => {
                        if (selectedIds.has(contextMenu.file.id)) {
                            setDeleteFileIds(Array.from(selectedIds));
                        } else {
                            setDeleteFileIds([contextMenu.file.id]);
                        }
                    }}
                />
            )}

            {/* Preview Modal */}
            {previewFile && (
                <FilePreviewModal
                    file={previewFile}
                    files={files}
                    onClose={() => setPreviewFile(null)}
                    onNavigate={setPreviewFile}
                />
            )}

            {/* Move Dialog */}
            {moveFileIds && (
                <FileMoveDialog
                    fileIds={moveFileIds}
                    currentProjectId={files.find(f => f.id === moveFileIds[0])?.projectId || null}
                    onClose={() => setMoveFileIds(null)}
                    onMove={handleMove}
                />
            )}

            {/* Delete Dialog */}
            {deleteFileIds && (
                <FileDeleteDialog
                    fileCount={deleteFileIds.length}
                    onClose={() => setDeleteFileIds(null)}
                    onConfirm={handleDelete}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
