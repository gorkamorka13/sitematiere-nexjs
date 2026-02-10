"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react";

// Configure worker - crucial for Next.js
// Configure worker - crucial for Next.js
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden relative">
      {/* PDF Controls */}
      <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
           <button
             onClick={() => setPageNumber(p => Math.max(1, p - 1))}
             disabled={pageNumber <= 1}
             className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
             title="Page précédente"
           >
             <ChevronLeft className="w-5 h-5" />
           </button>
           <span className="text-sm">Page {pageNumber} / {numPages || "-"}</span>
           <button
             onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
             disabled={pageNumber >= numPages}
             className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50"
             title="Page suivante"
           >
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>

        <div className="flex items-center gap-2">
            <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Zoom arrière"
            >
                <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button
                onClick={() => setScale(s => Math.min(2.0, s + 0.1))}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                title="Zoom avant"
            >
                <ZoomIn className="w-5 h-5" />
            </button>
        </div>
      </div>

      {/* PDF Render Area */}
      <div className="flex-1 overflow-auto flex justify-center p-4 bg-gray-100/50 dark:bg-gray-900/50 relative">
         {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
         )}

         <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="flex items-center gap-2">Chargement du PDF...</div>}
            error={<div className="text-red-500">Erreur lors du chargement du PDF</div>}
            className="flex flex-col items-center"
         >
            <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg"
            />
         </Document>
      </div>
    </div>
  );
}
