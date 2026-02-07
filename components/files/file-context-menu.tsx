"use client";

import { useEffect, useRef } from "react";
import { Download, Eye, FolderInput, Pencil, Trash2, RotateCcw } from "lucide-react";
import { FileData } from "./file-explorer";

interface FileContextMenuProps {
    x: number;
    y: number;
    file: FileData;
    onClose: () => void;
    onPreview: () => void;
    onRename: () => void;
    onMove: () => void;
    onDelete: () => void;
    onRestore?: () => void;
    showRestore?: boolean;
}

export function FileContextMenu({
    x, y, file, onClose,
    onPreview, onRename, onMove, onDelete, onRestore, showRestore
}: FileContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Close on escape
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // Adjust position if close to edge (basic implementation)
    // A simplified version, sophisticated positioning (like Radix UI) requires more setup.
    // For now, we just ensure it doesn't go off-screen roughly.
    const style: React.CSSProperties = {
        top: Math.min(y, window.innerHeight - 200),
        left: Math.min(x, window.innerWidth - 200),
    };

    return (
        <div
            ref={menuRef}
            style={style}
            className="fixed z-50 w-56 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b mb-1 truncate">
                {file.name}
            </div>

            {showRestore ? (
                 <button
                    onClick={() => { onRestore?.(); onClose(); }}
                    className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700"
                >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restaurer
                </button>
            ) : (
                <>
                    <button
                        onClick={() => { onPreview(); onClose(); }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700"
                    >
                        <Eye className="mr-2 h-4 w-4" />
                        Aperçu
                    </button>
                    <button
                        onClick={() => { onRename(); onClose(); }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700"
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Renommer
                    </button>
                    <button
                        onClick={() => { onMove(); onClose(); }}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700"
                    >
                        <FolderInput className="mr-2 h-4 w-4" />
                        Déplacer
                    </button>
                    <a
                        href={file.blobUrl}
                        download={file.name}
                        onClick={onClose}
                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground dark:hover:bg-gray-700 text-decoration-none text-inherit"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                    </a>
                </>
            )}

            <div className="h-px my-1 bg-muted dark:bg-gray-700" />

            <button
                onClick={() => { onDelete(); onClose(); }}
                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
            >
                <Trash2 className="mr-2 h-4 w-4" />
                {showRestore ? "Supprimer définitivement" : "Supprimer"}
            </button>
        </div>
    );
}
