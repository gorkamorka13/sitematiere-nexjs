interface VideoPlayerProps {
  url: string;
  mimeType?: string;
}

export function VideoPlayer({ url, mimeType }: VideoPlayerProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        key={url}
        controls
        preload="metadata"
        className="max-w-full max-h-[80vh] w-auto h-auto focus:outline-none"
        playsInline
        controlsList="nodownload"
      >
        <source src={url} type={mimeType || "video/mp4"} />
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  );
}
