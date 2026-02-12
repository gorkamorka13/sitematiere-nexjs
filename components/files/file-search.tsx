"use client";

import { Search, FileType } from "lucide-react";

interface FileSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  fileTypeFilter: string;
  onFilterChange: (type: string) => void;
  countryFilter: string;
  onCountryChange: (country: string) => void;
  projectFilter: string;
  onProjectChange: (project: string) => void;
  files?: {
    id: string;
    name: string;
    project?: { id: string; name: string; country: string } | null;
    projectId?: string | null;
  }[];
  onFileSelect?: (file: { id: string; name: string }) => void;
}

export function FileSearch({
  searchQuery,
  onSearchChange,
  fileTypeFilter,
  onFilterChange,
  countryFilter,
  onCountryChange,
  projectFilter,
  onProjectChange,
  files = [],
  onFileSelect,
}: FileSearchProps) {
  // Filter files based on constraints for the dropdown listing logic (optional but good for UX)
  // Here we just use all files to populate dropdowns

  // Sort files for the "Jump to" dropdown
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  // Extract unique countries
  const countries = Array.from(
    new Set(
      files
        .filter(f => f.project?.country)
        .map(f => f.project!.country)
    )
  ).sort();

  // Extract unique projects, filtered by selected country
  const projectsMap = new Map<string, string>();
  files.forEach(f => {
    if (f.project) {
        // Only add project if it matches the selected country (or if no country selected)
        // Handle "Autre" case: match projects with no country
        const matchesCountry = countryFilter === "Tous" ||
                               (countryFilter === "Autre" ? !f.project.country : f.project.country === countryFilter);

        if (matchesCountry) {
             projectsMap.set(f.project.id, f.project.name);
        }
    }
  });

  // Convert map to array and sort by name
  const projects = Array.from(projectsMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

  const hasOrphanedFiles = files.some(f => !f.project);
  // Check if there are any files with a project but without a country, OR orphaned files (which also have no country)
  const hasFilesNoCountry = files.some(f => !f.project?.country);

  return (
    <div className="flex flex-col xl:flex-row gap-4 w-full">
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

       {/* File List Dropdown (Jump to) */}
       <div className="relative min-w-[200px]">
         <select
           onChange={(e) => {
             const file = files.find((f) => f.id === e.target.value);
             if (file && onFileSelect) onFileSelect(file);
             e.target.value = "";
           }}
           className="w-full px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer text-ellipsis overflow-hidden whitespace-nowrap"
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
       </div>

      <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {/* Project Filter Dropdown */}
          <select
            value={projectFilter}
            onChange={(e) => onProjectChange(e.target.value)}
            className="px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[150px]"
          >
            <option value="ALL">Tous les projets ({projects.length})</option>
            {hasOrphanedFiles && <option value="ORPHANED">Sans projet</option>}
            {projects.map(([id, name]) => {
              const isSpecial = id === 'project-flags' || id === 'project-clients' || name === 'Flag' || name === 'client';
              return (
                <option key={id} value={id}>
                  {isSpecial ? `🔴 ${name}` : name}
                </option>
              );
            })}
          </select>

          {/* Country Filter Dropdown */}
          <select
            value={countryFilter}
            onChange={(e) => onCountryChange(e.target.value)}
            className="px-4 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="Tous">Tous les pays ({countries.length})</option>
            {hasFilesNoCountry && <option value="Autre">Autre (sans pays)</option>}
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>

          {/* File Type Filter Dropdown */}
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
    </div>
  );
}

