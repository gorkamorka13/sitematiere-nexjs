import { Video as ProjectVideo } from "@prisma/client";
import { Video } from "lucide-react";

interface VideoGalleryProps {
    videos: ProjectVideo[];
}

export function VideoGallery({ videos }: VideoGalleryProps) {
    if (!videos || videos.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Vidéos & Drone</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {videos.map((vid) => (
                            <div key={vid.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors cursor-pointer group">
                                <div className="w-12 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0">
                                    <Video className="w-4 h-4 text-red-500" />
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 truncate">{vid.title || "Vidéo sans titre"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
