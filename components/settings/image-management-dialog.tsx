'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useImageProcessor } from '@/hooks/use-image-processor';
import { DropZone } from '@/components/image-processor/DropZone';
import { Controls } from '@/components/image-processor/Controls';
import { CropTool } from '@/components/image-processor/CropTool';
import { ImagePreview } from '@/components/image-processor/ImagePreview';
import { Comparison } from '@/components/image-processor/Comparison';
import { History } from '@/components/image-processor/History';
import { DatabaseImagePicker } from '@/components/image-processor/DatabaseImagePicker';
import { ProjectSelectDialog } from '@/components/image-processor/ProjectSelectDialog';
import { ConflictDialog, ConflictResolution } from '@/components/image-processor/ConflictDialog';
import { Button } from '@/components/ui/button';
import { Upload, Database, Check, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

interface ImageManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageManagementDialog({ isOpen, onClose }: ImageManagementDialogProps) {
  const {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    isCropping,
    history,
    loadImage,
    loadImageFromUrl,
    resizeImageAction,
    enableCrop,
    applyCrop,
    commitProcessedImage,
    cancelProcessedImage,
    cancelCrop,
    downloadImage,
    loadFromHistory,
    reset
  } = useImageProcessor();

  const [showDatabasePicker, setShowDatabasePicker] = useState(false);
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [conflictData, setConflictData] = useState<{ fileName: string, projectId: string, file: File } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom event listener for the "Save to Database" button in Controls
  useEffect(() => {
    window.dispatchUploadEvent = () => {
        setShowProjectSelect(true);
    };
    return () => {
      delete window.dispatchUploadEvent;
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadImage(e.target.files[0]);
    }
  };

  const handleOpenLocalFile = () => {
    fileInputRef.current?.click();
  };

  const executeUpload = async (file: File, projectId: string, overwrite: boolean = false) => {
      setIsUploading(true);
      setConflictData(null);

      try {
          logger.debug("[UPLOAD] Starting upload for file:", file.name, "to project:", projectId);

          const formData = new FormData();
          formData.append('file', file);
          formData.append('projectId', projectId);
          if (overwrite) {
              formData.append('overwrite', 'true');
          }

          const uploadRes = await fetch('/api/files/upload', {
              method: 'POST',
              body: formData
          });

          const result = await uploadRes.json();

          if (uploadRes.status === 409 && result.conflict) {
              setConflictData({ fileName: result.fileName, projectId, file });
              return;
          }

          if (uploadRes.ok && result.success && result.files.length > 0) {
              setNotification({ type: 'success', message: 'Image enregistrée avec succès !' });
          } else {
              const errorMsg = result.errors?.[0]?.error || result.error || 'Erreur inconnue';
              setNotification({ type: 'error', message: `Échec : ${errorMsg}` });
          }
      } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          setNotification({ type: 'error', message: `Erreur réseau : ${err.message}` });
      } finally {
          setIsUploading(false);
          setTimeout(() => setNotification(null), 5000);
      }
  };

  const handleDatabaseSave = async (projectId: string) => {
      if (!currentImage) return;

      try {
          const res = await fetch(currentImage.src);
          if (!res.ok) throw new Error("Failed to fetch image data");
          const actualBlob = await res.blob();

          const ext = currentImage.src.split(';')[0].split('/')[1] || 'png';
          const filename = originalImage?.file?.name
            ? `mod_${originalImage.file.name.replace(/\.[^/.]+$/, "")}.${ext}`
            : `processed_${Date.now()}.${ext}`;

          const file = new File([actualBlob], filename, { type: actualBlob.type });

          setShowProjectSelect(false);
          await executeUpload(file, projectId);
      } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          setNotification({ type: 'error', message: err.message });
      }
  };

  const handleConflictResolve = async (resolution: ConflictResolution) => {
      if (!conflictData) return;
      const { file, projectId, fileName } = conflictData;

      if (resolution === 'cancel') {
          setConflictData(null);
          return;
      }

      if (resolution === 'overwrite') {
          await executeUpload(file, projectId, true);
      } else if (resolution === 'rename') {
          const newName = `copie_${fileName}`;
          const newFile = new File([file], newName, { type: file.type });
          await executeUpload(newFile, projectId, false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 lg:p-8 outline-none">
        {/* Backdrop */}
        <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={onClose}
        />

        {/* Dialog Content */}
        <div className="relative w-full max-w-6xl h-full max-h-[95vh] bg-white dark:bg-gray-950 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Outils Images</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Recadrer, redimensionner et optimiser vos images</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleOpenLocalFile}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs px-4"
                        size="sm"
                    >
                        <Upload className="w-4 h-4" />
                        Ouvrir (PC)
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileSelect}
                    />
                    <Button
                        onClick={() => setShowDatabasePicker(true)}
                        variant="outline"
                        className="gap-2 border-gray-200 dark:border-gray-700 font-bold uppercase tracking-widest text-[10px] sm:text-xs px-4"
                        size="sm"
                    >
                        <Database className="w-4 h-4" />
                        Bibliothèque (R2)
                    </Button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                {/* Notifications */}
                {notification && (
                    <div className={`fixed top-20 right-8 z-[1200] p-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-full ${
                        notification.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                        : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                    }`}>
                        {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span className="text-sm font-medium">{notification.message}</span>
                    </div>
                )}

                {/* Loading Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 z-[1210] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                            <p className="font-semibold text-gray-900 dark:text-white">Téléversement en cours...</p>
                        </div>
                    </div>
                )}

                {/* Processing Status Bar */}
                {processedImage && (
                    <div className="mb-6 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-3 rounded-2xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col items-start px-2">
                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Aperçu en cours</span>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                {processedImage.tempAction} : {processedImage.tempDetails}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelProcessedImage} className="text-xs font-bold uppercase tracking-wider">
                                Annuler
                            </Button>
                            <Button size="sm" onClick={commitProcessedImage} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider">
                                <Check className="w-4 h-4 mr-2" /> Valider
                            </Button>
                        </div>
                    </div>
                )}

                {/* Workspace */}
                <div className="h-full">
                    {!originalImage ? (
                        <div className="h-full min-h-[400px]">
                            <DropZone onImageLoad={loadImage} isLoading={isProcessing} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-4">
                                <Controls
                                    originalDimensions={currentImage ? { width: currentImage.width, height: currentImage.height } : null}
                                    onResize={resizeImageAction}
                                    onCrop={enableCrop}
                                    onDownload={downloadImage}
                                    isProcessing={isProcessing}
                                />
                                <History
                                    items={history}
                                    onSelect={loadFromHistory}
                                    onClear={reset}
                                />
                                <Button
                                    variant="ghost"
                                    onClick={reset}
                                    className="w-full text-sm text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                >
                                    Nouvelle image
                                </Button>
                            </div>

                            <div className="lg:col-span-2">
                                {processedImage ? (
                                    <Comparison original={originalImage} processed={processedImage} />
                                ) : (
                                    currentImage && (
                                        <ImagePreview
                                            imageSrc={currentImage.src}
                                            title="Image active"
                                            size={currentImage.size}
                                            dimensions={{ width: currentImage.width, height: currentImage.height }}
                                            filename={currentImage.file.name}
                                        />
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <DatabaseImagePicker
                isOpen={showDatabasePicker}
                onClose={() => setShowDatabasePicker(false)}
                onSelect={loadImageFromUrl}
            />
            <ProjectSelectDialog
                isOpen={showProjectSelect}
                onClose={() => setShowProjectSelect(false)}
                onSelect={handleDatabaseSave}
            />
            <ConflictDialog
                isOpen={!!conflictData}
                fileName={conflictData?.fileName || ''}
                onResolve={handleConflictResolve}
            />

            {/* Crop Overlay */}
            {isCropping && currentImage && (
                <div className="absolute inset-0 z-[1300]">
                    <CropTool
                        imageSrc={currentImage.src}
                        onApply={applyCrop}
                        onCancel={cancelCrop}
                    />
                </div>
            )}
        </div>
    </div>
  );
}
