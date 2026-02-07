"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Project } from "@prisma/client";
import { getIcon } from "@/lib/map-icons";

type MultiMapProps = {
    projects: Project[];
    onSelectProject?: (project: Project) => void;
    fitNonce?: number;
    globalCenterNonce?: number;
    globalCenterPoint?: [number, number] | null;
};

function CenterView({ point, nonce }: { point: [number, number] | null; nonce?: number }) {
    const map = useMap();

    useEffect(() => {
        if (!point) return;
        // Panner vers le point en conservant le zoom actuel
        map.setView(point, map.getZoom(), { animate: true });
    }, [point, nonce, map]);

    return null;
}

function MapUpdater({ projects, fitNonce }: { projects: Project[]; fitNonce?: number }) {
    const map = useMap();

    useEffect(() => {
        if (projects.length === 0) return;

        // This effect now depends on fitNonce to prevent zooming on every project selection
        // but still uses the latest projects list to calculate bounds.

        const validProjects = projects.filter(p => p.latitude !== 0 && p.longitude !== 0);

        if (validProjects.length > 0) {
            const bounds = L.latLngBounds(
                validProjects.map(p => [p.latitude, p.longitude])
            );

            map.fitBounds(bounds, {
                animate: true,
                duration: 1,
                padding: [50, 50],
                maxZoom: 10
            });
        }
    }, [projects, fitNonce, map]);

    return null;
}

export default function ProjectsMap({ projects, onSelectProject, fitNonce, globalCenterNonce, globalCenterPoint }: MultiMapProps) {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const validProjects = projects.filter(p => p.latitude !== 0 || p.longitude !== 0);

    return (
        <MapContainer
            center={[0, 0]}
            zoom={2}
            scrollWheelZoom={false}
            className="h-full w-full rounded-lg z-0"
            style={{ height: "100%", width: "100%", minHeight: "400px" }}
        >
            <CenterView point={globalCenterPoint || null} nonce={globalCenterNonce} />
            <TileLayer
                attribution={attribution}
                url={tileUrl}
            />
            {validProjects.map((project) => (
                <Marker
                    key={project.id}
                    position={[project.latitude, project.longitude]}
                    icon={getIcon(project.status)}
                    eventHandlers={{
                        click: () => onSelectProject?.(project),
                        popupopen: () => onSelectProject?.(project),
                    }}
                >
                    <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                        <div className="font-mono text-[10px]">
                            {project.latitude.toFixed(6)}, {project.longitude.toFixed(6)}
                        </div>
                    </Tooltip>
                </Marker>
            ))}

            <MapUpdater projects={validProjects} fitNonce={fitNonce} />
        </MapContainer>
    );
}
