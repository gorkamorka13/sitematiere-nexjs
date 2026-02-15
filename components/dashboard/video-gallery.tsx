"use client";

import { useState } from "react";
import type { Video as ProjectVideo } from "@prisma/client";
import { Video, X, Play } from "lucide-react";

interface VideoGalleryProps {
    videos: ProjectVideo[];
}

export function VideoGallery({ videos }: VideoGalleryProps) {
    const [selectedVideo, setSelectedVideo] = useState<ProjectVideo | null>(null);

    if (!videos || videos.length === 0) return null;

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                    <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center gap-2">
                        <Video className="w-4 h-4 text-orange-500" />
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Vidéos & Drone ({videos.length})</h3>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {videos.map((vid) => (
                                <div
                                    key={vid.id}
                                    onClick={() => setSelectedVideo(vid)}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors cursor-pointer group"
                                >
                                    <div className="w-12 h-8 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                        <Video className="w-4 h-4 text-red-500" />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Play className="w-4 h-4 text-white fill-white" />
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 truncate flex-1">{vid.title || "Vidéo sans titre"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Lecteur Vidéo */}
            {selectedVideo && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setSelectedVideo(null)}
                >
                    <div
                        className="bg-black rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
                            <h3 className="text-sm font-medium text-white truncate pr-4">
                                {selectedVideo.title || "Vidéo"}
                            </h3>
                            <button
                                onClick={() => setSelectedVideo(null)}
                                className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                        </div>
                        <div className="aspect-video bg-black">
                            <video
                                controls
                                autoPlay
                                className="w-full h-full"
                                src={selectedVideo.url}
                            >
                                <source src={selectedVideo.url} type="video/mp4" />
                                Votre navigateur ne supporte pas la lecture de vidéos.
                            </video>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
