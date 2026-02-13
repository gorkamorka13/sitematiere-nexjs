"use client";

import { useState, useEffect, useCallback } from "react";
import { FileSearch } from "./file-search";
import { FileToolbar } from "./file-toolbar";
import { FileGrid } from "./file-grid";
import { FileList } from "./file-list";
import { FilePreviewModal } from "./file-preview-modal";
import { FileContextMenu } from "./file-context-menu";
import { FileMoveDialog } from "./file-move-dialog";
import { FileDeleteDialog } from "./file-delete-dialog";
// import { useToast } from "@/components/ui/use-toast";
// If no toast, we can just console.log or use a simple alert for now.
import { FileType } from "@prisma/client";

export interface FileData {
    id: string;
    name: string;
    blobUrl: string;
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
    const [fileTypeFilter, setFileTypeFilter] = useState("ALL");
    const [countryFilter, setCountryFilter] = useState("Tous");
    const [projectFilter, setProjectFilter] = useState("ALL"); // New Project Filter State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'fileType' | 'size' | 'createdAt'; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

    // Auto-select country when project is selected
    useEffect(() => {
        if (projectFilter !== "ALL" && projectFilter !== "ORPHANED") {
            const projectFile = allFiles.find(f => f.project?.id === projectFilter);
            if (projectFile?.project?.country) {
                setCountryFilter(projectFile.project.country);
            }
        }
    }, [projectFilter, allFiles]);


    // Derived state for display (computed after state declarations)
    const filteredFiles = allFiles.filter(f => {
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
                // Show orphaned files or files without country
                return !f.project?.country;
            }
            // Show files from selected country
            return f.project?.country === countryFilter;
        }

        return true;
    });

    const files = [...filteredFiles].sort((a, b) => {
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

    const toggleSort = (key: 'name' | 'fileType' | 'size' | 'createdAt') => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    // Mock Toast for now if component doesn't exist, or try to import it.
    // I'll skip the import for now and use console.

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            // We do NOT send search query to API for now, we filter client side as discussed
            // if (searchQuery) params.append("search", searchQuery);
            // Update: We want the dropdown to have ALL files of the type, so we fetch all of type.

            if (fileTypeFilter !== "ALL") params.append("fileType", fileTypeFilter);

            const res = await fetch(`/api/files/list?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch files");

            const data = await res.json();
            setAllFiles(data.files || []); // Store all fetched files

        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            setLoading(false);
        }
    }, [fileTypeFilter]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles, refreshTrigger]);

    const handleSelect = (id: string, multi: boolean) => {
        const newSelection = new Set(multi ? selectedIds : []);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
    };



    const [renamingFile, setRenamingFile] = useState<FileData | null>(null);
    const [newName, setNewName] = useState("");
    const [previewFile, setPreviewFile] = useState<FileData | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileData } | null>(null);

    // Dialog States
    const [moveFileIds, setMoveFileIds] = useState<string[] | null>(null);
    const [deleteFileIds, setDeleteFileIds] = useState<string[] | null>(null);

    const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
        e.preventDefault();
        const file = files.find(f => f.id === id);
        if (file) {
            setContextMenu({ x: e.clientX, y: e.clientY, file });
        }
    }, [files]);

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

            setRefreshTrigger(prev => prev + 1);
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

            setRefreshTrigger(prev => prev + 1);
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

            setSelectedIds(new Set());
            setRefreshTrigger(prev => prev + 1);
            setDeleteFileIds(null);
        } catch (error) {
            console.error("Delete error:", error);
            alert("Erreur lors de la suppression");
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
                    onMove={() => setMoveFileIds([contextMenu.file.id])}
                    onDelete={() => setDeleteFileIds([contextMenu.file.id])}
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
        </div>
    );
}
