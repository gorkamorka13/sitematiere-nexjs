"use client";
// Force rebuild

import { useDropzone, DropzoneOptions } from "react-dropzone";
import { UploadCloud, FileUp } from "lucide-react";
import { useCallback } from "react";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "@/lib/files/validation";

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploadZone({ onFilesSelected, disabled }: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    disabled,
    maxSize: MAX_FILE_SIZE,
    // Construct accept object from our validation map
    accept: Object.keys(ALLOWED_FILE_TYPES).reduce((acc, mime) => {
      acc[mime] = ALLOWED_FILE_TYPES[mime as keyof typeof ALLOWED_FILE_TYPES];
      return acc;
    }, {} as Record<string, string[]>),
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        flex flex-col items-center justify-center gap-4 min-h-[200px]
        ${isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/5"
        }
        ${isDragReject ? "border-destructive/50 bg-destructive/5" : ""}
        ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className={`p-4 rounded-full bg-background border shadow-sm ${isDragActive ? "animate-bounce" : ""}`}>
        {isDragActive ? (
          <FileUp className="h-8 w-8 text-primary" />
        ) : (
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {isDragActive
            ? "Déposez les fichiers ici"
            : "Cliquez pour sélectionner ou glissez-déposez des fichiers ici"}
        </p>
        <p className="text-xs text-muted-foreground">
          Images (JPG, PNG, WebP), PDF, Documents (DOCX, XLSX) jusqu'à 150Ko
        </p>
      </div>
    </div>
  );
}
