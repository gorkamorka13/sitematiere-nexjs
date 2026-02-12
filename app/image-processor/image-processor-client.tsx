'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Image as ImageIcon, Upload, Database, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import AppLayout from "@/components/AppLayout";
import ProjectManagementDialog from "@/components/settings/project-management-dialog";
import FileManagementDialog from "@/components/settings/file-management-dialog";
import SettingsDialogs from "@/components/settings/settings-dialogs";
import { UserRole, Project, Document as ProjectDocument, Video as ProjectVideo } from "@prisma/client";

interface ImageProcessorClientProps {
    user: { name?: string | null; username?: string | null; role?: UserRole; color?: string | null };
    initialProjects: any[]; // Used for dialogs
}

export default function ImageProcessorClient({ user, initialProjects }: ImageProcessorClientProps) {
  const {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    setIsProcessing,
    isCropping,
    history,
    loadImage,
    loadImageFromUrl,
    resizeImageAction,
    enableCrop,
    applyCrop,
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

  // States for AppLayout dialogs
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isFileManagementOpen, setIsFileManagementOpen] = useState(false);
  const [isProjectManagementOpen, setIsProjectManagementOpen] = useState(false);
  const [projectManagementDefaultTab, setProjectManagementDefaultTab] = useState<'create' | 'modify' | 'delete'>('modify');

  // Custom event listener for the "Save to Database" button in Controls
  useEffect(() => {
      (window as any).dispatchUploadEvent = () => {
          setShowProjectSelect(true);
      };
      return () => {
        delete (window as any).dispatchUploadEvent;
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

          if (uploadRes.ok && result.success) {
              setNotification({ type: 'success', message: 'Image enregistrée avec succès !' });
          } else {
              setNotification({ type: 'error', message: `Échec : ${result.error || 'Erreur inconnue'}` });
          }
      } catch (error: any) {
          console.error("Upload error", error);
          setNotification({ type: 'error', message: `Erreur réseau : ${error.message}` });
      } finally {
          setIsUploading(false);
          setTimeout(() => setNotification(null), 5000);
      }
  };

  const handleDatabaseSave = async (projectId: string) => {
      if (!currentImage) return;

      setIsProcessing(true);
      try {
          const res = await fetch(currentImage.src);
          if (!res.ok) throw new Error("Failed to fetch image data");
          const actualBlob = await res.blob();

          const ext = currentImage.src.split(';')[0].split('/')[1] || 'png';
          const filename = (originalImage as any)?.file?.name
            ? `mod_${(originalImage as any).file.name.replace(/\.[^/.]+$/, "")}.${ext}`
            : `processed_${Date.now()}.${ext}`;

          const file = new File([actualBlob], filename, { type: actualBlob.type });

          setShowProjectSelect(false);
          await executeUpload(file, projectId);
      } catch (error: any) {
          setNotification({ type: 'error', message: error.message });
      } finally {
          setIsProcessing(false);
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

  return (
    <AppLayout
        user={user}
        onManageUsers={() => setIsUserManagementOpen(true)}
        onManageProjects={(tab: 'create' | 'modify' | 'delete') => {
            setProjectManagementDefaultTab(tab);
            setIsProjectManagementOpen(true);
        }}
        onManageFiles={() => setIsFileManagementOpen(true)}
    >
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8">
        {/* Notifications */}
        {notification && (
            <div className={`fixed top-4 right-4 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-full ${
                notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
            }`}>
                {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{notification.message}</span>
                <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-70">
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Loading Overlay for Upload */}
        {isUploading && (
            <div className="fixed inset-0 z-[110] bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                    <p className="font-semibold text-gray-900 dark:text-white">Téléversement en cours...</p>
                </div>
            </div>
        )}

        {/* Header */}
        <header className="text-center space-y-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
                <span className="text-indigo-600 dark:text-indigo-400">Gestion</span> Images
            </h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                Outil optimisé pour recadrer, redimensionner et compresser vos images.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4">
             <Button
                onClick={handleOpenLocalFile}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                size="lg"
             >
                <Upload className="w-4 h-4" />
                Ouvrir un fichier image
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
                className="gap-2"
                size="lg"
             >
                <Database className="w-4 h-4" />
                Choisir depuis la base de données
             </Button>
          </div>
        </header>

        {/* Drop Zone (Only if no image loaded) */}
        {!originalImage && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <DropZone onImageLoad={loadImage} isLoading={isProcessing} />
          </section>
        )}

        {/* Main Workspace */}
        {originalImage && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">

            {/* Left Column: Controls & History */}
            <div className="lg:col-span-1 space-y-6">
                 {/* Controls */}
                <Controls
                  originalDimensions={currentImage ? { width: currentImage.width, height: currentImage.height } : null}
                  onResize={resizeImageAction}
                  onCrop={enableCrop}
                  onDownload={downloadImage}
                  isProcessing={isProcessing}
                />

                {/* History */}
                <History
                  items={history}
                  onSelect={loadFromHistory}
                  onClear={reset}
                />

                <button
                    onClick={reset}
                    className="w-full text-sm text-red-500 hover:text-red-600 hover:underline text-center py-2"
                >
                    Tout réinitialiser (Nouvelle image)
                </button>
            </div>

            {/* Right Column: Previews */}
            <div className="lg:col-span-2 space-y-6">

                {/* Result Preview (if processed) */}
                {processedImage ? (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Résultat</h2>
                        </div>
                        <Comparison
                            originalSrc={originalImage.src}
                            processedSrc={processedImage.src}
                            originalDimensions={{ width: originalImage.width, height: originalImage.height }}
                            processedDimensions={{ width: processedImage.width, height: processedImage.height }}
                        />
                     </div>
                ) : (
                    // Current Working Image
                    currentImage && (
                        <div className="h-full min-h-[500px]">
                             <ImagePreview
                                imageSrc={currentImage.src}
                                title="Image de travail"
                                size={currentImage.size}
                                dimensions={{ width: currentImage.width, height: currentImage.height }}
                              />
                        </div>
                    )
                )}
            </div>

          </div>
        )}

        {/* Crop Tool Overlay */}
        {isCropping && currentImage && (
            <CropTool
              imageSrc={currentImage.src}
              onApply={applyCrop}
              onCancel={cancelCrop}
            />
        )}

        {/* Database Picker Modal */}
        <DatabaseImagePicker
            isOpen={showDatabasePicker}
            onClose={() => setShowDatabasePicker(false)}
            onSelect={(url, filename) => {
                loadImageFromUrl(url, filename);
            }}
        />

        {/* Project Selector Modal for Saving */}
        <ProjectSelectDialog
            isOpen={showProjectSelect}
            onClose={() => setShowProjectSelect(false)}
            onSelect={handleDatabaseSave}
        />

        {/* Conflict Resolution Modal */}
        <ConflictDialog
            isOpen={!!conflictData}
            fileName={conflictData?.fileName || ''}
            onResolve={handleConflictResolve}
        />

        {/* Shared Layout Dialogs */}
        <ProjectManagementDialog
            projects={initialProjects}
            isOpen={isProjectManagementOpen}
            onClose={() => setIsProjectManagementOpen(false)}
            userRole={user.role || UserRole.VISITOR}
            defaultTab={projectManagementDefaultTab}
        />

        <FileManagementDialog
            isOpen={isFileManagementOpen}
            isAdmin={user.role === "ADMIN"}
            onClose={() => setIsFileManagementOpen(false)}
        />

        <SettingsDialogs
            isAdmin={user.role === "ADMIN"}
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
