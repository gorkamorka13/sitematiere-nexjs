"use client";

import { Search, FileType } from "lucide-react";

interface FileSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fileTypeFilter: string;
  onFilterChange: (type: string) => void;
  countryFilter: string;
  onCountryChange: (country: string) => void;
  files?: { id: string; name: string; project?: { country: string } | null }[];
  onFileSelect?: (file: { id: string; name: string }) => void;
}

export function FileSearch({
  searchQuery,
  onSearchChange,
  fileTypeFilter,
  onFilterChange,
  countryFilter,
  onCountryChange,
  files = [],
  onFileSelect,
}: FileSearchProps) {
  // Sort files alphabetically
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  // Extract unique countries from files
  const countries = Array.from(
    new Set(
      files
        .filter(f => f.project?.country)
        .map(f => f.project!.country)
    )
  ).sort();

  // Check if there are orphaned files (files without a project)
  const hasOrphanedFiles = files.some(f => !f.project?.country);

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher des fichiers..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

       {/* File List Dropdown */}
       <div className="relative min-w-[200px]">
         <select
           onChange={(e) => {
             const file = files.find((f) => f.id === e.target.value);
             if (file && onFileSelect) onFileSelect(file);
             // Optionally reset select? Or keep it?
             // If we keep it, it shows the current selection.
             // If we reset, it acts as a "Jump to" trigger.
             e.target.value = ""; // Reset to placeholder
           }}
           className="w-full px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
           defaultValue=""
         >
           <option value="" disabled>
             📁 Aller au fichier... ({sortedFiles.length})
           </option>
           {sortedFiles.map((file) => (
             <option key={file.id} value={file.id}>
               {file.name}
             </option>
           ))}
         </select>
         {/* Custom arrow for appearance-none if we want, but default select is fine for MVP */}
       </div>

      {/* Country Filter Dropdown */}
      <select
        value={countryFilter}
        onChange={(e) => onCountryChange(e.target.value)}
        className="px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="Tous">Tous les pays</option>
        {hasOrphanedFiles && <option value="Autre">Autre (sans projet)</option>}
        {countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </select>

      <select
        value={fileTypeFilter}
        onChange={(e) => onFilterChange(e.target.value)}
        className="px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <option value="ALL">Tous les types</option>
        <option value="IMAGE">Images</option>
        <option value="VIDEO">Vidéos</option>
        <option value="DOCUMENT">Documents</option>
        <option value="ARCHIVE">Archives</option>
      </select>
    </div>
  );
}
