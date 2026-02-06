"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Project } from "@prisma/client";
import Link from "next/link";

// Fix for default Leaflet marker icons
const getIcon = (status: string) => {
    let iconUrl = "/images/pin/pin_done.png";
    if (status === 'CURRENT') iconUrl = "/images/pin/pin_underconstruction.png";
    if (status === 'PROSPECT') iconUrl = "/images/pin/pin_prospection.png";

    return L.icon({
        iconUrl: iconUrl,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

type MultiMapProps = {
    projects: Project[];
    onSelectProject?: (project: Project) => void;
};

function MapUpdater({ projects }: { projects: Project[] }) {
    const map = useMap();

    useEffect(() => {
        if (projects.length === 0) return;

        const lats = projects.map(p => p.latitude).filter(l => l !== 0);
        const longs = projects.map(p => p.longitude).filter(l => l !== 0);

        if (lats.length > 0 && longs.length > 0) {
            // Calculate geographic center (average)
            const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
            const avgLong = longs.reduce((a, b) => a + b, 0) / longs.length;

            // Move to center while preserving current zoom
            map.setView([avgLat, avgLong], map.getZoom(), {
                animate: true,
                duration: 1
            });
        }
    }, [projects, map]);

    return null;
}

export default function ProjectsMap({ projects, onSelectProject }: MultiMapProps) {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
                    }}
                >
                    <Popup>
                        <div className="text-center">
                            <strong className="block mb-1">{project.name}</strong>
                            <span className="text-xs text-gray-500 block mb-2">{project.country}</span>
                            <Link href={`/projects/${project.id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold">
                                Voir la fiche
                            </Link>
                        </div>
                    </Popup>
                </Marker>
            ))}

            <MapUpdater projects={validProjects} />
        </MapContainer>
    );
}
