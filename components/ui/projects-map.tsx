"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Project } from "@prisma/client";
import Link from "next/link";

// Fix for default Leaflet marker icons in Next.js/React
// We can define different icons based on status if we want
const getIcon = (status: string) => {
    let iconUrl = "/images/pin/pin_done.png";
    if (status === 'CURRENT') iconUrl = "/images/pin/pin_underconstruction.png";
    if (status === 'PROSPECT') iconUrl = "/images/pin/pin_prospection.png"; // Assuming we have this, else fallback

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

        // Calculate bounds
        const lats = projects.map(p => p.latitude).filter(l => l !== 0);
        const longs = projects.map(p => p.longitude).filter(l => l !== 0);

        if (lats.length > 0 && longs.length > 0) {
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLong = Math.min(...longs);
            const maxLong = Math.max(...longs);

            // Fit bounds with some padding
            map.fitBounds([
                [minLat, minLong],
                [maxLat, maxLong]
            ], { padding: [50, 50] });
        }
    }, [projects, map]);

    return null;
}

export default function ProjectsMap({ projects, onSelectProject }: MultiMapProps) {
    // Filter out projects with invalid coordinates (0,0 is often default)
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
