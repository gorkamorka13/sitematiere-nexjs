"use client";

import { useTransition } from "react";
import { X, FileIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatBytes } from "@/lib/utils"; // Assuming this utility exists or I'll need to create it locally
import { FileType } from "@prisma/client";
import Image from "next/image";

export interface FileUploadItemProps {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  onRemove: () => void;
}

export function FileUploadItem({
  file,
  progress,
  status,
  error,
  onRemove,
}: FileUploadItemProps) {
  const isImage = file.type.startsWith("image/");
  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="flex items-center gap-4 p-3 bg-card border rounded-lg group relative">
      {/* Visual Preview */}
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border flex items-center justify-center bg-muted">
        {isImage && previewUrl ? (
          <Image
            src={previewUrl}
            alt={file.name}
            fill
            className="object-cover"
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
        ) : (
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      {/* File Info & Progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium truncate pr-2" title={file.name}>
            {file.name}
          </p>
          {status === "uploading" && (
            <span className="text-xs text-muted-foreground">{progress}%</span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              status === "error" ? "bg-destructive" :
              status === "success" ? "bg-green-500" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-xs text-destructive mt-1 truncate" title={error}>
            {error}
          </p>
        )}
      </div>

      {/* Action / Status Icon */}
      <div className="shrink-0">
        {status === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : status === "error" ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : status === "uploading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <button
            onClick={onRemove}
            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </button>
        )}
      </div>
    </div>
  );
}
