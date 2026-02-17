'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Video as VideoIcon } from 'lucide-react';
import { getSignedVideoUploadAction } from '@/app/actions/video-actions';

interface VideoDropzoneProps {
    projectId: string;
    onUpload: (url: string, title: string) => Promise<void>;
    onError: (err: string) => void;
}

export function VideoDropzone({ projectId, onUpload, onError }: VideoDropzoneProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<'idle' | 'preparing' | 'uploading' | 'saving'>('idle');

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);
        setProgress(0);
        setStatus('preparing');

        try {
            // 1. Get signed URL
            const result = await getSignedVideoUploadAction(projectId, file.name, file.type);

            if (!result.success || !result.signedUrl || !result.publicUrl) {
                throw new Error(result.error || "Impossible de préparer l'envoi");
            }

            // 2. Upload to R2 directly with XHR to track progress
            setStatus('uploading');
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', result.signedUrl!);
                xhr.setRequestHeader('Content-Type', file.type);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setProgress(percentComplete);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status === 200) resolve(true);
                    else reject(new Error(`Erreur lors de l'envoi (${xhr.status})`));
                };

                xhr.onerror = () => reject(new Error("Erreur réseau lors de l'envoi"));
                xhr.send(file);
            });

            // 3. Delegate DB saving to parent
            setStatus('saving');
            await onUpload(result.publicUrl, file.name.replace(/\.[^/.]+$/, ""));

        } catch (err: unknown) {
            console.error("Upload error:", err);
            onError(err instanceof Error ? err.message : "Une erreur est survenue lors de l'envoi");
            setProgress(0);
        } finally {
            setUploading(false);
            setStatus('idle');
            setProgress(0);
        }
    }, [projectId, onUpload, onError]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'video/*': ['.mp4', '.mov', '.avi', '.webm', '.m4v']
        },
        maxFiles: 1,
        disabled: uploading
    });

    const getStatusMessage = () => {
        switch (status) {
            case 'preparing': return 'PRÉPARATION...';
            case 'uploading': return 'ENVOI EN COURS...';
            case 'saving': return 'ENREGISTREMENT...';
            default: return 'ENVOI EN COURS...';
        }
    };

    return (
        <div
            {...getRootProps()}
            className={`relative flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${isDragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' :
                uploading ? 'border-gray-200 bg-gray-50/50 cursor-not-allowed' :
                    'border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
        >
            <input {...getInputProps()} />

            {uploading ? (
                <div className="flex flex-col items-center gap-3 w-full px-8">
                    <div className="relative w-12 h-12 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <span className="absolute text-[10px] font-bold text-indigo-600">{progress}%</span>
                    </div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{getStatusMessage()}</p>
                    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <div className="p-2 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                        <VideoIcon className={`w-5 h-5 ${isDragActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {isDragActive ? 'Déposez la vidéo ici' : 'Glissez une vidéo ou cliquez'}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter mt-1">MP4, MOV, AVI, WEBM (Max 500MB)</p>
                    </div>
                </div>
            )}
        </div>
    );
}
