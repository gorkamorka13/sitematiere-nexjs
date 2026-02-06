"use client";

import { FileStack, FileText, ImageIcon, Trash2, FolderOpen, AlertCircle, X, Info } from "lucide-react";
import { useState, useEffect } from "react";

interface FileManagementDialogProps {
    isOpen: boolean;
    isAdmin: boolean;
    onClose: () => void;
}

export default function FileManagementDialog({ isOpen, isAdmin, onClose }: FileManagementDialogProps) {
    // Statut fictif pour l'ébauche - En production, on chargerait les vraies données
    const stats = {
        totalImages: 124,
        totalPdfs: 42,
        storageUsed: "450 MB",
        storageLimit: "1 GB",
        orphanedFiles: 8
    };

    const progressPercentage = (450 / 1024) * 100;

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
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-800 border-none shadow-2xl rounded-2xl animate-in zoom-in-95 duration-300">
                {/* Header */}
                <header className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <FileStack className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Gestion des Fichiers</h2>
                            <p className="text-indigo-100 text-xs font-medium">Administration globale du stockage et des documents</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* Status Card 1: Storage */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Stockage (Vercel Blob)</span>
                                <AlertCircle className="w-4 h-4 text-indigo-500" />
                            </div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.storageUsed}</span>
                                <span className="text-xs text-gray-500">/ {stats.storageLimit}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full transition-all duration-1000"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Status Card 2: Counts */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Répartition</span>
                                <FolderOpen className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Images</span>
                                    </div>
                                    <span className="font-bold">{stats.totalImages}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-gray-600 dark:text-gray-400">Documents PDF</span>
                                    </div>
                                    <span className="font-bold">{stats.totalPdfs}</span>
                                </div>
                            </div>
                        </div>

                        {/* Status Card 3: Orphans */}
                        <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Maintenance</span>
                                <Trash2 className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.orphanedFiles}</span>
                                <span className="text-xs text-amber-600/70">Fichiers orphelins</span>
                            </div>
                            <p className="text-[10px] text-amber-600/70 italic leading-tight">Ces fichiers ne sont rattachés à aucun projet.</p>
                            <button className="mt-3 w-full py-1.5 bg-amber-200 dark:bg-amber-800 text-[10px] font-bold uppercase tracking-tighter rounded-lg text-amber-800 dark:text-amber-200 hover:bg-amber-300 transition-colors">
                                Nettoyer
                            </button>
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
                                    Cette section permet de gérer les fichiers qui ont été téléversés mais qui n'apparaissent plus dans la base de données.
                                    Elle est strictement réservée au rôle Administrateur.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all active:scale-95 shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                        Fermer
                    </button>
                </footer>
            </div>
        </div>
    );
}
