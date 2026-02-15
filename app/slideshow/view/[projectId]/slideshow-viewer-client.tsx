'use client';

import AppLayout from "@/components/AppLayout";
import { SlideshowViewer } from "@/components/slideshow/SlideshowViewer";
import { UserRole } from "@/lib/enums";

interface SlideshowImage {
  id: string;
  image: {
    id: string;
    url: string;
    alt: string | null;
  };
}

interface User {
  name?: string | null;
  username?: string | null;
  role?: UserRole;
  color?: string | null;
}

interface SlideshowViewerClientProps {
  images: SlideshowImage[];
  projectName: string;
  user: User;
}

export default function SlideshowViewerClient({ images, projectName, user }: SlideshowViewerClientProps) {
  return (
    <AppLayout user={user}>
      <div className="p-6">
        <SlideshowViewer images={images} projectName={projectName} />
      </div>
    </AppLayout>
  );
}
