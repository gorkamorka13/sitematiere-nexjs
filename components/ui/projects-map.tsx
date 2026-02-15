"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";
import type { Project, Document } from "@prisma/client";
import { getIcon } from "@/lib/map-icons";

type ProjectWithDocs = Project & { documents?: Document[] };

type MultiMapProps = {
    projects: ProjectWithDocs[];
    onSelectProject?: (project: Project) => void;
    selectedProjectId?: string;
    fitNonce?: number;
    globalCenterNonce?: number;
    globalCenterPoint?: [number, number] | null;
    isCapture?: boolean;
};

function CenterView({ point, nonce }: { point: [number, number] | null; nonce?: number }) {
    const map = useMap();

    useEffect(() => {
        if (!point) return;
        // Panner vers le point et forcer un zoom de 15 pour voir les détails
        map.setView(point, 15, { animate: true });
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
                padding: [80, 80],
                maxZoom: 12
            });
        }
    }, [projects, fitNonce, map]);

    return null;
}

interface BouncingMarker extends L.Marker {
    _bounceInterval?: ReturnType<typeof setInterval> | null;
}

export default function ProjectsMap({ projects, onSelectProject, selectedProjectId, fitNonce, globalCenterNonce, globalCenterPoint, isCapture }: MultiMapProps) {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const markersRef = useRef<Map<string, L.Marker>>(new Map());

    const validProjects = projects.filter(p => p.latitude !== 0 || p.longitude !== 0);

    // Effect to handle bounce animation when selectedProjectId changes
    useEffect(() => {
        if (!selectedProjectId) return;

        const selectedMarker = markersRef.current.get(selectedProjectId) as BouncingMarker;

        // Stop all other markers from bouncing
        markersRef.current.forEach((marker, id) => {
            if (id !== selectedProjectId) {
                const bouncingMarker = marker as BouncingMarker;
                // Clear any existing animation interval
                if (bouncingMarker._bounceInterval) {
                    clearInterval(bouncingMarker._bounceInterval);
                    bouncingMarker._bounceInterval = null;
                }
            }
        });

        // Start bouncing the selected marker using Leaflet's native animation
        if (selectedMarker) {
            const originalLatLng = selectedMarker.getLatLng();
            let bounceUp = true;
            let offset = 0;
            const maxOffset = 0.0003; // Approximately 30 meters in latitude
            const step = maxOffset / 10;

            // Clear any existing animation
            if (selectedMarker._bounceInterval) {
                clearInterval(selectedMarker._bounceInterval);
            }

            // Create bounce animation
            selectedMarker._bounceInterval = setInterval(() => {
                if (bounceUp) {
                    offset += step;
                    if (offset >= maxOffset) {
                        bounceUp = false;
                    }
                } else {
                    offset -= step;
                    if (offset <= 0) {
                        bounceUp = true;
                        offset = 0;
                    }
                }

                const newLat = originalLatLng.lat + offset;
                selectedMarker.setLatLng([newLat, originalLatLng.lng]);
            }, 30); // 30ms interval for smooth animation
        }

        // Cleanup function
        return () => {
            if (selectedMarker) {
                if (selectedMarker._bounceInterval) {
                    clearInterval(selectedMarker._bounceInterval);
                    selectedMarker._bounceInterval = null;
                }
            }
        };
    }, [selectedProjectId]);

    return (
        <MapContainer
            center={[0, 0]}
            zoom={2}
            scrollWheelZoom={false}
            zoomControl={!isCapture}
            attributionControl={!isCapture}
            preferCanvas={!isCapture}
            className="h-full w-full rounded-lg z-0"
            style={{ height: "100%", width: "100%", minHeight: "400px" }}
        >
            <CenterView point={globalCenterPoint || null} nonce={globalCenterNonce} />
            <TileLayer
                url={tileUrl}
            />
            {validProjects.map((project) => (
                <Marker
                    key={project.id}
                    position={[project.latitude, project.longitude]}
                    icon={getIcon(project.status, project.documents?.find(d => d.type === 'PIN')?.url)}
                    ref={(ref) => {
                        if (ref) {
                            markersRef.current.set(project.id, ref as unknown as L.Marker);
                        }
                    }}
                    eventHandlers={{
                        click: () => onSelectProject?.(project),
                        popupopen: () => onSelectProject?.(project),
                    }}
                >
                    {!isCapture && (
                        <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                            <div className="font-bold text-xs uppercase tracking-tight">
                                {project.name}
                            </div>
                        </Tooltip>
                    )}
                </Marker>
            ))}

            <MapUpdater projects={validProjects} fitNonce={fitNonce} />
        </MapContainer>
    );
}
