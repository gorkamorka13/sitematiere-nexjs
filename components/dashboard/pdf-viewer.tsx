"use client";

interface PdfViewerProps {
    documents: { url: string; name: string }[];
}

export function PdfViewer({ documents }: PdfViewerProps) {
    if (!documents || documents.length === 0) {
        return <div className="p-4 text-center text-gray-500">Aucun PDF disponible</div>;
    }
    const currentPdf = documents[0];
    return (
        <div className="flex flex-col w-full h-full">
            <div className="relative w-full h-[600px]">
                <iframe
                    src={currentPdf.url.startsWith('http') ? `${currentPdf.url}#toolbar=1&navpanes=0&scrollbar=1` : `/${currentPdf.url}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0 rounded-b-xl"
                    title={currentPdf.name}
                />
            </div>
        </div>
    );
}
