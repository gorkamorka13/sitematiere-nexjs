"use client";

import dynamic from "next/dynamic";
import type { Project } from "@prisma/client";

const ProjectsMap = dynamic(() => import("./projects-map"), {
    ssr: false,
    loading: () => <p className="flex items-center justify-center h-full text-gray-500 bg-gray-100 rounded-lg">Chargement de la carte des projets...</p>
});

type Props = {
    projects: Project[];
    onSelectProject?: (project: Project) => void;
    selectedProjectId?: string;
    fitNonce?: number;
    globalCenterNonce?: number;
    globalCenterPoint?: [number, number] | null;
};

export default function ProjectsMapWrapper(props: Props) {
    return <ProjectsMap {...props} />;
}
