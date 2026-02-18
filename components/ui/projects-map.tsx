import { MapContainer, TileLayer, Marker, Tooltip, useMap, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import type { Project, Document } from "@/lib/db/schema";
import { getIcon } from "@/lib/map-icons";
import { Maximize2, Minimize2 } from "lucide-react";
import { Portal } from "./portal";

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

// Sub-component to handle map resize when fullscreen toggles
function MapResizer({ isFullScreen }: { isFullScreen: boolean }) {
    const map = useMap();
    useEffect(() => {
        // Delay slightly to allow the container transition to finish
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [isFullScreen, map]);
    return null;
}

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

export default function ProjectsMap({ projects, onSelectProject, selectedProjectId, fitNonce, globalCenterNonce, globalCenterPoint, isCapture }: MultiMapProps) {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const [isFullScreen, setIsFullScreen] = useState(false);

    const validProjects = projects.filter(p => p.latitude !== 0 || p.longitude !== 0);
    const selectedProject = validProjects.find(p => p.id === selectedProjectId);

    // Escape sets fullscreen to false
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsFullScreen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const mapContent = (
        <div className={isFullScreen ? "fixed inset-0 z-[999] bg-white dark:bg-gray-950 p-4 animate-in fade-in zoom-in-95 duration-200" : "relative h-full w-full"}>
            {!isCapture && (
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className={`absolute right-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95 ${
                        isFullScreen 
                            ? "top-16 lg:top-4 z-[1000]" 
                            : "top-4 z-[700]"
                    }`}
                    title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
                >
                    {isFullScreen ? <Minimize2 className="w-5 h-5 text-red-500" /> : <Maximize2 className="w-5 h-5 text-indigo-600" />}
                </button>
            )}

            <MapContainer
                center={[0, 0]}
                zoom={2}
                scrollWheelZoom={isFullScreen}
                zoomControl={!isCapture}
                attributionControl={!isCapture}
                preferCanvas={!isCapture}
                className="h-full w-full rounded-lg z-0"
                style={{ height: "100%", width: "100%", minHeight: isFullScreen ? "100%" : "400px" }}
            >
                <MapResizer isFullScreen={isFullScreen} />
                <CenterView point={globalCenterPoint || null} nonce={globalCenterNonce} />
                <TileLayer
                    url={tileUrl}
                />
                {validProjects.map((project) => (
                    <Marker
                        key={project.id}
                        position={[project.latitude, project.longitude]}
                        icon={getIcon(project.status, project.documents?.find(d => d.type === 'PIN')?.url)}
                        zIndexOffset={project.id === selectedProjectId ? 1000 : 0}
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

                {/* Selection Halo */}
                {selectedProject && (
                    <CircleMarker
                        center={[selectedProject.latitude, selectedProject.longitude]}
                        radius={20}
                        pathOptions={{
                            color: '#E62726',
                            fillColor: '#E62726',
                            fillOpacity: 0.2,
                            weight: 2,
                            dashArray: '5, 5'
                        }}
                    />
                )}

                <MapUpdater projects={validProjects} fitNonce={fitNonce} />
            </MapContainer>
        </div>
    );

    if (isFullScreen) {
        return <Portal>{mapContent}</Portal>;
    }

    return mapContent;
}
