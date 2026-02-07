interface VideoPlayerProps {
  url: string;
}

export function VideoPlayer({ url }: VideoPlayerProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        src={url}
        controls
        className="max-w-full max-h-[80vh] w-auto h-auto focus:outline-none"
        playsInline
      >
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  );
}
