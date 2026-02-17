'use client';

import { useState, useEffect } from 'react';
import { Folder, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogger } from '@/lib/logger';

interface Project {
    id: string;
    name: string;
    country?: string | null;
}

interface ProjectSelectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (projectId: string) => void;
}

export function ProjectSelectDialog({ isOpen, onClose, onSelect }: ProjectSelectDialogProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const logger = useLogger('ProjectSelectDialog');

    useEffect(() => {
        if (!isOpen) return;

        async function fetchProjects() {
            setLoading(true);
            try {
                const res = await fetch('/api/projects');
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                }
            } catch (error) {
                logger.error("Failed to fetch projects", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, [isOpen, logger]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-300">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white uppercase tracking-tight">Enregistrer dans la base</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                    <p className="text-sm text-gray-500 mb-4 font-medium">Choisissez un projet pour enregistrer votre image modifiée.</p>

                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        ) : projects.length === 0 ? (
                            <p className="text-center p-8 text-gray-400">Aucun projet trouvé.</p>
                        ) : (
                            projects.map(project => (
                                <button
                                    key={project.id}
                                    onClick={() => setSelectedId(project.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selectedId === project.id
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 border'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent border'
                                        }`}
                                >
                                    <Folder className={`w-5 h-5 ${selectedId === project.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className={`text-sm font-medium ${selectedId === project.id ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {project.name}
                                    </span>
                                </button>
                            ))
                        )}

                        <button
                            onClick={() => setSelectedId('global_unassigned')}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selectedId === 'global_unassigned'
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 border'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent border'
                                }`}
                        >
                            <Folder className={`w-5 h-5 ${selectedId === 'global_unassigned' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${selectedId === 'global_unassigned' ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}>
                                Bibliothèque Globale (Sans projet)
                            </span>
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
                    <Button variant="outline" onClick={onClose} className="rounded-xl uppercase text-xs font-bold tracking-widest">Annuler</Button>
                    <Button
                        disabled={!selectedId}
                        onClick={() => selectedId && onSelect(selectedId)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl uppercase text-xs font-bold tracking-widest px-6 shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        Enregistrer ici
                    </Button>
                </div>
            </div>
        </div>
    );
}
