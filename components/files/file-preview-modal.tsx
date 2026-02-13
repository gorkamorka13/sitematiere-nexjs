"use client";

import { X, ChevronLeft, ChevronRight, Download, ExternalLink } from "lucide-react";
import { useEffect, useCallback } from "react";
import { FileData } from "./file-explorer";
import { VideoPlayer } from "./video-player";
import { ImageViewer } from "./image-viewer";
import dynamic from "next/dynamic";

const PDFViewer = dynamic(() => import("./pdf-viewer").then((mod) => mod.PDFViewer), {
  ssr: false,
  loading: () => <div className="text-white text-center">Chargement du lecteur PDF...</div>,
});

interface FilePreviewModalProps {
    file: FileData;
    files: FileData[]; // Required for navigation
    onClose: () => void;
    onNavigate: (file: FileData) => void;
}

export function FilePreviewModal({ file, files, onClose, onNavigate }: FilePreviewModalProps) {
    const currentIndex = files.findIndex(f => f.id === file.id);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < files.length - 1 && currentIndex !== -1;

    const handlePrevious = useCallback(() => {
        if (hasPrevious) onNavigate(files[currentIndex - 1]);
    }, [currentIndex, files, hasPrevious, onNavigate]);

    const handleNext = useCallback(() => {
        if (hasNext) onNavigate(files[currentIndex + 1]);
    }, [currentIndex, files, hasNext, onNavigate]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft") handlePrevious();
            if (e.key === "ArrowRight") handleNext();
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlePrevious, handleNext, onClose]);

    const renderContent = () => {
        switch (file.fileType) {
            case "IMAGE":
                return <ImageViewer url={file.blobUrl} alt={file.name} />;
            case "VIDEO":
                return <VideoPlayer url={file.blobUrl} />;
            case "DOCUMENT":
                // Basic check for PDF
                if (file.mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                    return <PDFViewer url={file.blobUrl} />;
                }
                return (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <p>Aperçu non disponible pour ce document.</p>
                        <a
                            href={file.blobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Ouvrir dans un nouvel onglet
                        </a>
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full text-white">
                        <p>Format de fichier non supporté pour l&apos;aperçu.</p>
                        <p className="text-sm text-gray-400 mt-2">({file.mimeType})</p>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white z-10 bg-black/50">
                <div className="flex flex-col">
                    <h3 className="font-semibold text-lg truncate max-w-[80vw]">{file.name}</h3>
                    <span className="text-xs text-gray-400">
                        {currentIndex + 1} sur {files.length} • {(file.size / 1024).toFixed(1)} KB
                    </span>
                </div>
                <div className="flex items-center gap-4">
                     <a
                        href={file.blobUrl}
                        download={file.name}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Télécharger"
                     >
                        <Download className="w-6 h-6" />
                     </a>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="Fermer (Esc)"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
                 {/* Navigation Buttons */}
                 {hasPrevious && (
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 z-20 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all group"
                    >
                        <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                 )}
                 {hasNext && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 z-20 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all group"
                    >
                        <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                 )}

                 {/* Content */}
                 <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-center">
                    {renderContent()}
                 </div>
            </div>
        </div>
    );
}
