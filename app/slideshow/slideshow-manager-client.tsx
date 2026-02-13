'use client';

import AppLayout from "@/components/AppLayout";
import { SlideshowManager } from "@/components/slideshow/SlideshowManager";
import { UserRole } from "@prisma/client";

interface Project {
  id: string;
  name: string;
  country: string | null;
}

interface User {
  name?: string | null;
  username?: string | null;
  role?: UserRole;
  color?: string | null;
}

interface SlideshowManagerClientProps {
  initialProjects: Project[];
  user: User;
}

export default function SlideshowManagerClient({ initialProjects, user }: SlideshowManagerClientProps) {
  return (
    <AppLayout user={user}>
      <SlideshowManager projects={initialProjects} />
    </AppLayout>
  );
}
