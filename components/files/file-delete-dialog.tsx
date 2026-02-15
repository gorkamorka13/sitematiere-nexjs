"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";

interface FileDeleteDialogProps {
    fileCount: number;
    isPermanent?: boolean; // If true, immediate permanent delete (e.g. from trash)
    onClose: () => void;
    onConfirm: (permanent: boolean) => Promise<void>;
}

export function FileDeleteDialog({ fileCount, isPermanent = false, onClose, onConfirm }: FileDeleteDialogProps) {
    const [permanent, setPermanent] = useState<boolean>(isPermanent || true);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        setSubmitting(true);
        await onConfirm(permanent);
        setSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-background p-6 rounded-lg shadow-xl w-full max-w-sm border border-red-100 dark:border-red-900/30">
                <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                        <Trash2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-semibold">Supprimer {fileCount} fichier(s) ?</h3>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    {permanent
                        ? "Cette action est irréversible. Les fichiers seront définitivement effacés."
                        : "Les fichiers seront déplacés vers la corbeille pendant 30 jours."
                    }
                </p>

                {!isPermanent && (
                    <div className="flex items-center gap-2 mb-6 ml-1">
                        <input
                            type="checkbox"
                            id="permanent-delete"
                            checked={permanent}
                            onChange={(e) => setPermanent(e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                        />
                        <label htmlFor="permanent-delete" className="text-sm text-foreground cursor-pointer select-none">
                            Supprimer définitivement
                        </label>
                    </div>
                )}

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
                        disabled={submitting}
                        className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
}
