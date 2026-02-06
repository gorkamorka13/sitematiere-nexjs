"use client";

import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from "react-leaflet";
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
    }, [nonce, map]);

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
    }, [fitNonce, map]); // Removed projects from dependencies to avoid auto-zoom on filter sync

    return null;
}

export default function ProjectsMap({ projects, onSelectProject, fitNonce, globalCenterNonce, globalCenterPoint }: MultiMapProps) {
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
