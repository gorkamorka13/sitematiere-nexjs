"use client";

import dynamic from "next/dynamic";

const ProjectMap = dynamic(() => import("./project-map"), {
    ssr: false,
    loading: () => <p className="flex items-center justify-center h-full text-gray-500">Chargement de la carte...</p>
});

type Props = {
    latitude: number;
    longitude: number;
    projectName?: string;
    country?: string;
    popupText?: string;
    status?: string | null;
    customPinUrl?: string;
    nonce?: number;
};

export default function ProjectMapWrapper(props: Props) {
    return (
        <ProjectMap
            {...props}
            status={props.status ?? null}
            projectName={props.projectName ?? "Projet sans nom"}
            country={props.country ?? ""}
            customPinUrl={props.customPinUrl ?? null}
        />
    );
}
