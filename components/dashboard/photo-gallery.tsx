"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Project } from "@prisma/client";
import { ImageIcon, ChevronLeft, ChevronRight, SkipBack, Play, Pause, Square, SkipForward } from "lucide-react";
import { normalizeImageUrl } from "@/lib/utils/image-url";

interface PhotoGalleryProps {
    selectedProject: Project | null;
    dynamicImages: { url: string; name: string }[];
    isLoading: boolean;
}

export function PhotoGallery({ selectedProject, dynamicImages, isLoading }: PhotoGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const images = dynamicImages;

    useEffect(() => {
        if (isPlaying && images.length > 1) {
            intervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            }, 3000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isPlaying, images.length]);

    const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    const goToStart = () => setCurrentIndex(0);
    const goToEnd = () => setCurrentIndex(images.length - 1);
    const stopSlideshow = () => { setIsPlaying(false); setCurrentIndex(0); };

    if (!selectedProject || (images.length === 0 && !isLoading)) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[350px]">
                    <span className="text-sm text-gray-400 italic">Aucune photo disponible</span>
                </div>
            </div>
        );
    }

    if (isLoading && images.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full">
                <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="p-4 flex items-center justify-center min-h-[350px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
            <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-pink-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Photos</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
                        {currentIndex + 1} / {images.length}
                    </span>
                    {isPlaying && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                </div>
            </div>

            <div className="relative flex-grow flex flex-col min-h-[350px]">
                <div className="flex-grow px-3 py-4">
                    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 group">
                        <Image
                            src={normalizeImageUrl(images[currentIndex].url)}
                            alt={images[currentIndex].name || `Photo ${currentIndex + 1}`}
                            fill
                            className="object-contain transition-opacity duration-500"
                        />
                        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={prevSlide} className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                            <button onClick={nextSlide} className="p-2 bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-colors"><ChevronRight className="w-6 h-6" /></button>
                        </div>
                    </div>
                </div>
                <div className="px-4">
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${((currentIndex + 1) / images.length) * 100}%` }} />
                    </div>
                </div>
                <div className="px-3 pb-4 pt-3 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={goToStart} disabled={currentIndex === 0} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30"><SkipBack className="w-4 h-4 fill-current" /></button>
                        <button onClick={prevSlide} className="p-2 text-gray-500 hover:text-indigo-600"><ChevronLeft className="w-5 h-5" /></button>
                        {!isPlaying ? (
                            <button onClick={() => setIsPlaying(true)} className="p-3 bg-indigo-600 text-white rounded-full"><Play className="w-5 h-5 fill-current" /></button>
                        ) : (
                            <button onClick={() => setIsPlaying(false)} className="p-3 bg-amber-500 text-white rounded-full"><Pause className="w-5 h-5 fill-current" /></button>
                        )}
                        <button onClick={stopSlideshow} className="p-2 text-gray-500 hover:text-red-500"><Square className="w-4 h-4 fill-current" /></button>
                        <button onClick={nextSlide} className="p-2 text-gray-500 hover:text-indigo-600"><ChevronRight className="w-5 h-5" /></button>
                        <button onClick={goToEnd} disabled={currentIndex === images.length - 1} className="p-2 text-gray-500 hover:text-indigo-600 disabled:opacity-30"><SkipForward className="w-4 h-4 fill-current" /></button>
                    </div>
                    <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-gray-400 px-2">
                        <span>{isPlaying ? 'Automatique (3s)' : 'Manuel'}</span>
                        <span className="font-mono text-gray-500">{images[currentIndex].name || `photo_${currentIndex + 1}`}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
