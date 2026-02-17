'use client';

import { X } from 'lucide-react';

interface SerializedVideo {
    id: string;
    url: string;
    title: string | null;
}

interface VideoPreviewModalProps {
    video: SerializedVideo | null;
    onClose: () => void;
}

export function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
    if (!video) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative max-w-5xl w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="absolute top-4 left-6 z-10 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl">
                    <h3 className="text-white font-bold text-sm">{video.title}</h3>
                </div>
                <video
                    src={video.url}
                    controls
                    autoPlay
                    className="w-full h-full"
                >
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
            </div>
        </div>
    );
}
