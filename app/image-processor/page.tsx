'use client';

import { useImageProcessor } from '@/hooks/use-image-processor';
import { DropZone } from '@/components/image-processor/DropZone';
import { Controls } from '@/components/image-processor/Controls';
import { CropTool } from '@/components/image-processor/CropTool';
import { ImagePreview } from '@/components/image-processor/ImagePreview';
import { Comparison } from '@/components/image-processor/Comparison';
import { History } from '@/components/image-processor/History';

export default function ImageProcessorPage() {
  const {
    originalImage,
    currentImage,
    processedImage,
    isProcessing,
    isCropping,
    history,
    loadImage,
    resizeImageAction,
    enableCrop,
    applyCrop,
    cancelCrop,
    downloadImage,
    loadFromHistory,
    reset
  } = useImageProcessor();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 transition-colors">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">
            <span className="text-indigo-600 dark:text-indigo-400">Gestion</span> Images
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Outil optimisé pour recadrer, redimensionner et compresser vos images avant upload.
          </p>
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

      </div>
    </main>
  );
}
