'use client';

import { AlertTriangle, Copy, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ConflictResolution = 'overwrite' | 'rename' | 'cancel';

interface ConflictDialogProps {
    isOpen: boolean;
    fileName: string;
    onResolve: (resolution: ConflictResolution) => void;
}

export function ConflictDialog({ isOpen, fileName, onResolve }: ConflictDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-red-100 dark:border-red-900/30 overflow-hidden animate-in zoom-in-95 duration-300">

                <div className="p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto transition-transform animate-in zoom-in duration-300">
                        <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Fichier existant</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Un fichier nommé <span className="font-bold text-gray-900 dark:text-gray-200">&quot;{fileName}&quot;</span> existe déjà dans ce projet. Que souhaitez-vous faire ?
                        </p>
                    </div>
                </div>

                <div className="p-4 grid grid-cols-1 gap-2 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        onClick={() => onResolve('overwrite')}
                        className="w-full justify-start gap-3 bg-red-600 hover:bg-red-700 text-white border-0"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>Remplacer le fichier existant</span>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => onResolve('rename')}
                        className="w-full justify-start gap-3 border-gray-200 dark:border-gray-700"
                    >
                        <Copy className="w-4 h-4" />
                        <span>Enregistrer comme copie (copie_{fileName})</span>
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={() => onResolve('cancel')}
                        className="w-full justify-start gap-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X className="w-4 h-4" />
                        <span>Annuler l&apos;enregistrement</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
