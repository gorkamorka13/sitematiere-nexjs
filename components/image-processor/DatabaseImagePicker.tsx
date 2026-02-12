'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { FileGrid } from '@/components/files/file-grid';
import { FileData } from '@/components/files/file-explorer'; // Reusing FileData type

interface DatabaseImagePickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string, filename: string) => void;
}

export function DatabaseImagePicker({ isOpen, onClose, onSelect }: DatabaseImagePickerProps) {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Fetch images when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchImages();
            setSelectedId(null);
            setSearchQuery('');
        }
    }, [isOpen]);

    const fetchImages = async () => {
        setLoading(true);
        try {
            // Fetch only images
            const res = await fetch('/api/files/list?fileType=IMAGE&limit=100');
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
            }
        } catch (error) {
            console.error("Failed to fetch images", error);
        } finally {
            setLoading(false);
        }
    };

    // Filter files client-side for responsiveness
    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (id: string) => {
        setSelectedId(id);
    };

    const handleConfirm = () => {
        if (selectedId) {
            const file = files.find(f => f.id === selectedId);
            if (file) {
                // Use blobUrl (Vercel Blob URL)
                onSelect(file.blobUrl, file.name);
                onClose();
            }
        }
    };

    return (
        // Start with a basic fixed overlay if Dialog components aren't perfect yet
        // But let's try to use standard modal structure if possible.
        // I'll use a fixed overlay with styling similar to other modals I've seen in the codebase.
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Choisir une image de la bibliothèque
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        Fermer
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Rechercher une image..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-black/20">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Aucune image trouvée
                        </div>
                    ) : (
                        <FileGrid
                            files={filteredFiles}
                            selectedIds={new Set(selectedId ? [selectedId] : [])}
                            onSelect={(id) => handleSelect(id)}
                            // Disable other actions
                            onRename={undefined}
                            onPreview={undefined}
                            onContextMenu={undefined}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 bg-white dark:bg-gray-900">
                    <Button variant="outline" onClick={onClose}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Sélectionner
                    </Button>
                </div>
            </div>
        </div>
    );
}
