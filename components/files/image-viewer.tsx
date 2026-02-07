import Image from "next/image";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ImageViewerProps {
  url: string;
  alt: string;
}

export function ImageViewer({ url, alt }: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/90">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}
      <div className="relative w-full h-full max-w-5xl max-h-[80vh]">
        <Image
          src={url}
          alt={alt}
          fill
          className={`object-contain transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
        />
      </div>
    </div>
  );
}
