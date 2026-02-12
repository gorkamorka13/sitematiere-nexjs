"use client";

import { FileType as PrismaFileType } from "@prisma/client";
import { FileIcon, ImageIcon, FileText, Video, Archive, MoreVertical, Calendar, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { formatBytes } from "@/lib/utils";

import { FileData } from "./file-explorer";

// interface FileData { ... } // Removed local definition

interface FileListProps {
    files: FileData[];
    selectedIds: Set<string>;
    onSelect: (id: string, multi: boolean) => void;
    onRename?: (file: FileData) => void;
    onPreview?: (file: FileData) => void;
    onContextMenu?: (e: React.MouseEvent, id: string) => void;
    sortConfig?: { key: 'name' | 'fileType' | 'size' | 'createdAt'; direction: 'asc' | 'desc' } | null;
    onSort?: (key: 'name' | 'fileType' | 'size' | 'createdAt') => void;
}

export function FileList({ files, selectedIds, onSelect, onRename, onPreview, onContextMenu, sortConfig, onSort }: FileListProps) {
    if (files.length === 0) {
         return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <p>Aucun fichier trouvé</p>
            </div>
        );
    }

    const renderSortIcon = (key: 'name' | 'fileType' | 'size' | 'createdAt') => {
        if (sortConfig?.key !== key) return null;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1 inline" /> : <ChevronDown className="w-4 h-4 ml-1 inline" />;
    };

    return (
        <div className="w-full overflow-auto p-4 pb-20">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-left text-muted-foreground select-none">
                        <th className="pb-3 pl-2 w-10">
                            {/* Checkbox All? */}
                        </th>
                        <th
                            className="pb-3 pl-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => onSort?.('name')}
                        >
                            Nom {renderSortIcon('name')}
                        </th>
                        <th
                            className="pb-3 font-medium hidden sm:table-cell cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => onSort?.('fileType')}
                        >
                            Type {renderSortIcon('fileType')}
                        </th>
                        <th
                            className="pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => onSort?.('size')}
                        >
                            Taille {renderSortIcon('size')}
                        </th>
                        <th
                            className="pb-3 font-medium hidden md:table-cell cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => onSort?.('createdAt')}
                        >
                            Date {renderSortIcon('createdAt')}
                        </th>
                        <th className="pb-3 w-10"></th>
                    </tr>
                </thead>
                <tbody>
                    {files.map((file) => {
                         const isSelected = selectedIds.has(file.id);
                         const date = new Date(file.createdAt).toLocaleDateString();

                         return (
                            <tr
                                key={file.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(file.id, e.ctrlKey || e.metaKey);
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    onPreview?.(file);
                                }}
                                className={`
                                    group border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer text-sm
                                    ${isSelected ? "bg-indigo-50/60 dark:bg-indigo-900/20" : ""}
                                `}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    onContextMenu?.(e, file.id);
                                }}
                            >
                                <td className="py-2 pl-2">
                                     <div className={`
                                        w-4 h-4 rounded border flex items-center justify-center
                                        ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}
                                    `}>
                                        {isSelected && <div className="w-2 h-2 bg-current rounded-sm" />}
                                    </div>
                                </td>
                                <td className="py-2 pl-2 font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden relative">
                                            {file.thumbnailUrl ? (
                                                <Image
                                                    src={file.thumbnailUrl}
                                                    alt=""
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <FileIconWrapper type={file.fileType} className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <span className="truncate max-w-[200px] sm:max-w-[300px]">{file.name}</span>
                                    </div>
                                </td>
                                <td className="py-2 hidden sm:table-cell text-muted-foreground lowercase">
                                    {file.fileType}
                                </td>
                                <td className="py-2 text-muted-foreground font-mono text-xs">
                                    {formatBytes(file.size)}
                                </td>
                                <td className="py-2 hidden md:table-cell text-muted-foreground">
                                    {date}
                                </td>
                                <td className="py-2 text-right pr-2 flex justify-end gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRename?.(file);
                                        }}
                                        className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground"
                                        title="Renommer"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                    </button>
                                    <button className="p-1 hover:bg-background rounded text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FileIconWrapper({ type, className }: { type: PrismaFileType; className?: string }) {
    switch (type) {
        case "IMAGE": return <ImageIcon className={className} />;
        case "VIDEO": return <Video className={className} />;
        case "DOCUMENT": return <FileText className={className} />;
        case "ARCHIVE": return <Archive className={className} />;
        default: return <FileIcon className={className} />;
    }
}
