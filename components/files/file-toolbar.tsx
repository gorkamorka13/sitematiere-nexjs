"use client";

import { Trash2, Grid, List as ListIcon, Loader2, RefreshCw, FolderInput } from "lucide-react";

interface FileToolbarProps {
  selectedCount: number;
  viewMode: "grid" | "list";
  onViewChange: (mode: "grid" | "list") => void;
  onDelete: () => void;
  onMove: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  hasSelection?: boolean;
}

export function FileToolbar({
  selectedCount,
  viewMode,
  onViewChange,
  onDelete,
  onMove,
  onRefresh,
  isRefreshing,
}: FileToolbarProps) {
  return (
    <div className="flex items-center justify-between p-2 bg-muted/40 rounded-lg">
      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={onMove}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/30 rounded-md transition-colors"
              title="Déplacer la sélection"
            >
              <FolderInput className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-950/30 rounded-md transition-colors"
              title="Supprimer la sélection"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground px-2">
            Aucune sélection
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onRefresh}
          className={`p-1.5 hover:bg-background rounded-md transition-colors ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"
            }`}
          title="Actualiser"
        >
          {isRefreshing ? <Loader2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        <button
          onClick={() => onViewChange("grid")}
          className={`p-1.5 rounded-md transition-all ${viewMode === "grid"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50"
            }`}
          title="Vue Grille"
        >
          <Grid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewChange("list")}
          className={`p-1.5 rounded-md transition-all ${viewMode === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/50"
            }`}
          title="Vue Liste"
        >
          <ListIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
