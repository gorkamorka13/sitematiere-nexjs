"use client";

import { useState, useEffect } from "react";
import { Folder, Loader2 } from "lucide-react";

interface Project {
    id: string;
    name: string;
    country?: string | null;
}

interface FileMoveDialogProps {
    fileIds: string[];
    currentProjectId: string | null;
    onClose: () => void;
    onMove: (targetProjectId: string) => Promise<void>;
}

export function FileMoveDialog({ fileIds, currentProjectId, onClose, onMove }: FileMoveDialogProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Fetch projects
        // We need an endpoint for this. Assuming /api/projects exists or similar.
        // If not, we might need to mock or create one.
        // In this app, projects are likely fetchable.
        // Let's assume /api/projects returns list.
        async function fetchProjects() {
            try {
                const res = await fetch("/api/projects");
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                }
            } catch (error) {
                console.error("Failed to fetch projects", error);
            } finally {
                setLoading(false);
            }
        }
        fetchProjects();
    }, []);

    const handleSubmit = async () => {
        if (!selectedProject) return;
        setSubmitting(true);
        await onMove(selectedProject);
        setSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-md border">
                <h3 className="text-lg font-semibold mb-2">Déplacer les fichiers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez le projet de destination pour {fileIds.length} fichier(s).
                </p>

                <div className="max-h-60 overflow-y-auto border rounded-md p-1 space-y-1 mb-4">
                    {loading ? (
                         <div className="flex items-center justify-center p-4">
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        projects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => setSelectedProject(project.id)}
                                disabled={project.id === currentProjectId}
                                className={`
                                    w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors
                                    ${selectedProject === project.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted text-foreground"
                                    }
                                    ${project.id === currentProjectId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                `}
                            >
                                <Folder className="w-4 h-4" />
                                <span className="truncate">
                                    {(project.id === 'project-flags' || project.id === 'project-clients' || project.id === 'project-pins' || project.country === 'Système') ? `🔴 ${project.name}` : project.name}
                                </span>
                                {project.id === currentProjectId && <span className="ml-auto text-xs opacity-70">(Actuel)</span>}
                            </button>
                        ))
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded"
                        disabled={submitting}
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedProject || submitting}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Déplacer
                    </button>
                </div>
            </div>
        </div>
    );
}
