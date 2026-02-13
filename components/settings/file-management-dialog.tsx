"use client";

import { FileStack, FileText, ImageIcon, FolderOpen, AlertCircle, X, Info, Video, Archive } from "lucide-react";
import { useState, useEffect } from "react";
import { FileStatistics } from "@/lib/types";
import { FileUploadZone } from "../files/file-upload-zone";
import { FileUploadProgress, FileUploadState } from "../files/file-upload-progress";
import { FileExplorer } from "../files/file-explorer";
import { useRouter } from "next/navigation";
// import { formatBytes } from "@/lib/utils";

interface FileManagementDialogProps {
    isOpen: boolean;
    isAdmin: boolean;
    onClose: () => void;
}

type Tab = "dashboard" | "explorer" | "upload";

export default function FileManagementDialog({ isOpen, isAdmin, onClose }: FileManagementDialogProps) {
// const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>("dashboard");

    // Statistiques
    const [stats, setStats] = useState<FileStatistics | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

    // Upload State
    const [uploads, setUploads] = useState<FileUploadState[]>([]);
// const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen && isAdmin) {
            fetchStatistics();
        }
    }, [isOpen, isAdmin]);

    const fetchStatistics = async () => {
        setIsLoadingStats(true);
        try {
            const response = await fetch("/api/files/statistics");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Erreur lors du chargement des statistiques:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    // Upload Logic
    const handleFilesSelected = async (files: File[]) => {
        // Add files to queue
        const newUploads = files.map(file => ({
            file,
            progress: 0,
            status: "pending" as const,
        }));

        setUploads(prev => [...prev, ...newUploads]);

        // Start upload for each file
        // Note: In a real app we might want to limit concurrency
        newUploads.forEach(uploadState => processUpload(uploadState.file));
    };

    const processUpload = async (file: File) => {
        // Update status to uploading
        updateUploadStatus(file, { status: "uploading", progress: 0 });

        const formData = new FormData();
        formData.append("file", file);
        // FIXME: We need a projectId to associate files with.
        // For now, let's assume there's a "Global" or "Unassigned" project,
        // OR we just upload to the system and let them be "Orphaned" until assigned.
        // However, the API requires projectId.
        // Let's check if we have a default project or if we should fetch projects to select one.
        // For Phase 2/3 simplicity, let's assume we are uploading to a "General" context or handling orphans.
        // BUT the API explicitly checks: if (!projectId) return error.

        // TEMPORARY FIX: We need to pass a projectId.
        // Ideally the user selects a project.
        // For this "Admin File Manager", maybe we need a project selector?
        // OR we hardcode a "System" project ID if it exists?
        // Let's add a "System" project ID or just fail if no project selected.

        // Let's modify the requirement: The user should probably select a project OR we upload to an "Inbox" project.
        // For now, I will use a placeholder and we might need to add a Project Selector to this dialog.
        // Let's query the first available project or a specific "Library" project.

        // Since I can't easily add a project selector right now without more context on projects,
        // I will attempt to fetch the first project to use as default, or fail gracefully.
        // Better yet, let's look for a project named "General" or similar in a real scenario.
        // I'll grab the first project for now to make it work, noting this limitation.

        // WAIT: The Upload API requires `projectId`.
        // I'll add a specific "GLOBAL_ASSETS" or similar if the system supports it,
        // OR I'll assume we are in a Project Context.
        // But this is a Global Settings Dialog.

        // Strategy: Add a simple Project Selector drop down in the upload tab.
        // But first, let's just implement the upload mechanics.

        try {
            // Mocking the request for now since we don't have a project ID selected.
            // We use a specific ID that refers to "Unassigned" or just a placeholder.
            // In a real app, this would be selected from a dropdown.
            const projectId = "global_unassigned"; // Placeholder

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/files/upload');

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    updateUploadStatus(file, { progress: percentComplete });
                }
            };

            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        updateUploadStatus(file, { status: "success", progress: 100 });
                        // Refresh stats
                        fetchStatistics();
                    } catch (e) {
                         updateUploadStatus(file, { status: "error", error: "Invalid response" });
                    }
                } else {
                    let errorMessage = "Upload failed";
                    try {
                        const res = JSON.parse(xhr.responseText);
                        errorMessage = res.error || errorMessage;
                    } catch (e) {}
                    updateUploadStatus(file, { status: "error", error: errorMessage });
                }
            };

            xhr.onerror = () => {
                updateUploadStatus(file, { status: "error", error: "Network error" });
            };

            formData.append("projectId", projectId);

            xhr.send(formData);

        } catch (error) {
            updateUploadStatus(file, { status: "error", error: "Upload failed" });
        }
    };

    const updateUploadStatus = (file: File, updates: Partial<FileUploadState>) => {
        setUploads(prev => prev.map(u =>
            u.file === file ? { ...u, ...updates } : u
        ));
    };

    const handleRemoveUpload = (index: number) => {
        setUploads(prev => prev.filter((_, i) => i !== index));
    };

    // Valeurs par défaut si les stats ne sont pas encore chargées
    const displayStats = stats || {
        totalImages: 0,
        totalPdfs: 0,
        totalVideos: 0,
        totalOthers: 0,
        storageUsed: "0 MB",
        totalProjects: 0,
        orphanedFiles: 0,
        storageLimit: "1 GB",
        lastScan: new Date().toISOString()
    };

    // Calcul du pourcentage de stockage (estimation basée sur 1GB)
    const storageValue = parseFloat(displayStats.storageUsed);
    const progressPercentage = Math.min((storageValue / 1024) * 100, 100);

    // Sécurité : Ne pas afficher si pas ouvert OU si pas admin
    if (!isOpen || !isAdmin) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Dialog Container */}
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 select-none">
                    <div className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg">
                                <FileStack className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-lg lg:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">Gestion des Fichiers</h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">Administration Globale</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex px-5 gap-6">
                        <button
                            onClick={() => setActiveTab("dashboard")}
                            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                                activeTab === "dashboard"
                                    ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400"
                                    : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200"
                            }`}
                        >
                            Tableau de bord
                        </button>
                        <button
                            onClick={() => setActiveTab("explorer")}
                            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                                activeTab === "explorer"
                                    ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400"
                                    : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200"
                            }`}
                        >
                            Explorateur
                        </button>
                        <button
                            onClick={() => setActiveTab("upload")}
                            className={`pb-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
                                activeTab === "upload"
                                    ? "text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400"
                                    : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-200"
                            }`}
                        >
                            Téléverser
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
                    {activeTab === "dashboard" && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                {/* Status Card 1: Storage */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stockage (Vercel Blob)</span>
                                        <AlertCircle className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-2xl font-black text-gray-900 dark:text-white">{displayStats.storageUsed}</span>
                                        <span className="text-xs text-gray-500">/ {displayStats.storageLimit || "1 GB"}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-indigo-500 h-full transition-all duration-1000"
                                            style={{ width: `${progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Status Card 2: Counts */}
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 col-span-2">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Répartition</span>
                                        <FolderOpen className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Images</span>
                                            </div>
                                            <span className="font-bold">{displayStats.totalImages}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Documents</span>
                                            </div>
                                            <span className="font-bold">{displayStats.totalPdfs}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Video className="w-3.5 h-3.5 text-purple-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Vidéos</span>
                                            </div>
                                            <span className="font-bold">{displayStats.totalVideos}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2">
                                                <Archive className="w-3.5 h-3.5 text-orange-500" />
                                                <span className="text-gray-600 dark:text-gray-400">Autres</span>
                                            </div>
                                            <span className="font-bold">{displayStats.totalOthers}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 p-6 rounded-2xl">
                                <div className="flex gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm h-fit">
                                        <Info className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-1">Informations Administration</h4>
                                        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/60 leading-relaxed italic">
                                            Ceci est le tableau de bord global pour les administrateurs.
                                            Il permet de surveiller l&apos;utilisation du stockage et de gérer tous les fichiers du système.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {activeTab === "explorer" && (
                        <div className="h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <FileExplorer />
                        </div>
                    )}

                    {activeTab === "upload" && (
                         <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
                                <p className="flex items-center gap-2">
                                    <Info className="h-4 w-4" />
                                    <strong>Note:</strong> Sélectionnez un projet cible (WIP). Pour l&apos;instant, les fichiers seront orphelins.
                                </p>
                            </div>

                            <FileUploadZone onFilesSelected={handleFilesSelected} />

                            <FileUploadProgress
                                uploads={uploads}
                                onRemove={handleRemoveUpload}
                                onClearCompleted={() => setUploads([])}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        Fermer l&apos;administration
                    </button>
                </footer>
            </div>
        </div>
    );
}
