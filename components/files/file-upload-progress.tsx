"use client";

import { FileUploadItem } from "./file-upload-item";
import { UploadCloud, CheckCircle2 } from "lucide-react";

export interface FileUploadState {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  url?: string; // Result URL
}

interface FileUploadProgressProps {
  uploads: FileUploadState[];
  onRemove: (index: number) => void;
  onClearCompleted: () => void;
}

export function FileUploadProgress({ uploads, onRemove, onClearCompleted }: FileUploadProgressProps) {
  if (uploads.length === 0) return null;

  const completedCount = uploads.filter(
    (u) => u.status === "success" || u.status === "error"
  ).length;

  const totalCount = uploads.length;
  const isAllCompleted = completedCount === totalCount && totalCount > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <UploadCloud className="h-4 w-4" />
          Fichiers ({completedCount}/{totalCount})
        </h3>
        {isAllCompleted && (
          <button
            onClick={onClearCompleted}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Tout effacer
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {uploads.map((upload, index) => (
          <FileUploadItem
            key={`${upload.file.name}-${index}`}
            file={upload.file}
            progress={upload.progress}
            status={upload.status}
            error={upload.error}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>

      {/* Global Status Footer if needed */}
      {isAllCompleted && (
        <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Tous les transferts sont terminés.</span>
        </div>
      )}
    </div>
  );
}
