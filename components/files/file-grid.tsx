"use client";

import { FileType as PrismaFileType } from "@/lib/enums";
import { FileIcon, ImageIcon, FileText, Video, Archive, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { formatBytes } from "@/lib/utils";

import { FileData } from "./file-explorer";

// interface FileData { ... } // Removed local definition

interface FileGridProps {
    files: FileData[];
    selectedIds: Set<string>;
    onSelect: (id: string, multi: boolean, toggle?: boolean) => void;
    onRename?: (file: FileData) => void;
    onPreview?: (file: FileData) => void;
    onContextMenu?: (e: React.MouseEvent, id: string) => void;
}

/**
 * Check if a file is from Client, Flag or Pins directory
 * These directories need reduced display dimensions
 */
function isReducedSizeDirectory(blobPath: string): boolean {
    const lowerPath = blobPath.toLowerCase();
    return lowerPath.includes('/client/') || lowerPath.includes('/flag/') || lowerPath.includes('/pins/') ||
        lowerPath.startsWith('client/') || lowerPath.startsWith('flag/') || lowerPath.startsWith('pins/');
}

export function FileGrid({ files, selectedIds, onSelect, onRename, onPreview, onContextMenu }: FileGridProps) {
    if (files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                <FileIcon className="h-12 w-12 mb-4 opacity-20" />
                <p>Aucun fichier trouvé</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4 pb-20">
            {files.map((file) => {
                const isSelected = selectedIds.has(file.id);
                const isImage = file.fileType === "IMAGE";
                const isVideo = file.fileType === "VIDEO";
                const isReducedSize = isReducedSizeDirectory(file.blobPath);

                return (
                    <div
                        key={file.id}
                        className={`
                            group relative rounded-xl border bg-card cursor-pointer transition-all overflow-hidden
                            hover:shadow-md hover:border-primary/50
                            ${isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "border-border"}
                            ${isReducedSize ? "h-24 sm:h-28 md:h-32" : "aspect-square"}
                        `}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(file.id, e.ctrlKey || e.metaKey);
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            onPreview?.(file);
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            onContextMenu?.(e, file.id);
                        }}
                    >
                        {/* Thumbnail / Icon */}
                        <div className={`flex items-center justify-center bg-muted/20 ${isReducedSize ? "h-16 sm:h-20 md:h-24 w-full" : "absolute inset-0"}`}>
                            {isImage && file.thumbnailUrl ? (
                                <Image
                                    src={file.thumbnailUrl}
                                    alt={file.name}
                                    fill={!isReducedSize}
                                    width={isReducedSize ? 80 : undefined}
                                    height={isReducedSize ? 60 : undefined}
                                    className={`${isReducedSize ? "object-contain max-h-full max-w-full w-auto h-auto" : "object-cover"}`}
                                    sizes={isReducedSize ? "80px" : "(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"}
                                />
                            ) : isImage && file.blobUrl ? (
                                <Image
                                    src={file.blobUrl}
                                    alt={file.name}
                                    fill={!isReducedSize}
                                    width={isReducedSize ? 80 : undefined}
                                    height={isReducedSize ? 60 : undefined}
                                    className={`${isReducedSize ? "object-contain max-h-full max-w-full w-auto h-auto" : "object-cover"}`}
                                    sizes={isReducedSize ? "80px" : "200px"}
                                />
                            ) : isVideo && file.thumbnailUrl ? (
                                <div className={`relative ${isReducedSize ? "w-full h-full" : "w-full h-full"}`}>
                                    <Image
                                        src={file.thumbnailUrl}
                                        alt={file.name}
                                        fill={!isReducedSize}
                                        width={isReducedSize ? 80 : undefined}
                                        height={isReducedSize ? 60 : undefined}
                                        className={`${isReducedSize ? "object-contain max-h-full max-w-full w-auto h-auto" : "object-cover"}`}
                                        sizes={isReducedSize ? "80px" : "200px"}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="p-2 bg-black/50 rounded-full backdrop-blur-sm">
                                            <Video className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <FileIconWrapper type={file.fileType} className={`text-muted-foreground/50 ${isReducedSize ? "w-6 h-6" : "w-12 h-12"}`} />
                            )}
                        </div>

                        {/* Selection Checkbox */}
                        <div
                            className={`
                                absolute z-10 transition-opacity cursor-pointer
                                ${isReducedSize ? "top-1 left-1" : "top-2 left-2"}
                                ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                            `}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect(file.id, false, true); // Force toggle
                            }}
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} le fichier ${file.name}`}
                        >
                            <div className={`
                                rounded-full border flex items-center justify-center
                                ${isSelected ? "bg-primary border-primary text-primary-foreground" : "bg-white/80 border-gray-300 hover:border-primary"}
                                ${isReducedSize ? "w-4 h-4" : "w-5 h-5"}
                            `}>
                                {isSelected && <CheckCircle2 className={`${isReducedSize ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}`} aria-hidden="true" />}
                            </div>
                        </div>

                        {/* Edit Button */}
                        <div className={`
                            absolute z-10 transition-opacity opacity-0 group-hover:opacity-100
                            ${isReducedSize ? "top-1 right-1" : "top-2 right-2"}
                        `}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRename?.(file);
                                }}
                                className={`bg-white/80 rounded-full hover:bg-white text-gray-700 shadow-sm ${isReducedSize ? "p-0.5" : "p-1"}`}
                                title="Renommer"
                                aria-label={`Renommer le fichier ${file.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width={isReducedSize ? 10 : 14} height={isReducedSize ? 10 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>

                        {/* Footer Info */}
                        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent ${isReducedSize ? "p-1 pt-3" : "p-2 pt-6"}`}>
                            <p className={`font-medium text-white truncate ${isReducedSize ? "text-[9px]" : "text-xs"}`} title={file.name}>
                                {file.name}
                            </p>
                            {!isReducedSize && (
                                <p className="text-[10px] text-white/70">
                                    {formatBytes(file.size)}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
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
