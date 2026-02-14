import Image from "next/image";
import { Project, Document as ProjectDocument } from "@prisma/client";
import { FileText } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils/image-url";

interface ProjectDescriptionProps {
    selectedProject: Project | null;
    flagDoc: ProjectDocument | undefined;
    logoDoc: ProjectDocument | undefined;
}

// Helper function to format description text (replace \n with actual line breaks)
function formatDescription(text: string | null | undefined): string {
    if (!text) return "";
    return text.replace(/\\n/g, '\n');
}

export function ProjectDescription({ selectedProject, flagDoc, logoDoc }: ProjectDescriptionProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors flex flex-col flex-grow min-h-0">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Description</h3>
                </div>
                <div className="flex items-center gap-3">
                    {flagDoc && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                            <div className="w-7 h-4.5 relative rounded-[2px] overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                                <Image
                                    src={normalizeImageUrl(flagDoc.url)}
                                    alt=""
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight hidden sm:inline-block">{selectedProject?.country}</span>
                        </div>
                    )}
                    {logoDoc && (
                        <div className="h-7 px-2 py-1 bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center shrink-0 relative w-[100px]">
                            <Image
                                src={normalizeImageUrl(logoDoc.url)}
                                alt=""
                                fill
                                className="object-contain opacity-90"
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line overflow-y-auto custom-scrollbar">
                {formatDescription(selectedProject?.description) || "Sélectionnez un projet pour voir sa description."}
            </div>
        </div>
    );
}
