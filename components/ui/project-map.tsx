import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { getIcon } from "@/lib/map-icons";
import { Maximize2, Minimize2 } from "lucide-react";
import { Portal } from "./portal";

type MapProps = {
    latitude: number;
    longitude: number;
    status: string | null;
    projectName: string;
    country: string;
    popupText?: string;
    customPinUrl?: string | null;
    nonce?: number;
    isCapture?: boolean;
};

// Sub-component to handle map resize when fullscreen toggles
function MapResizer({ isFullScreen }: { isFullScreen: boolean }) {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [isFullScreen, map]);
    return null;
}

export default function ProjectMap({ latitude, longitude, status, projectName, customPinUrl, nonce, isCapture }: MapProps) {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const [isFullScreen, setIsFullScreen] = useState(false);

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
                    className="absolute top-4 right-4 z-[700] p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105 active:scale-95"
                    title={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
                >
                    {isFullScreen ? <Minimize2 className="w-5 h-5 text-red-500" /> : <Maximize2 className="w-5 h-5 text-indigo-600" />}
                </button>
            )}

            <MapContainer
                key={`${latitude}-${longitude}-${nonce}-${isFullScreen}`}
                center={[latitude, longitude]}
                zoom={14}
                scrollWheelZoom={isFullScreen}
                zoomControl={!isCapture}
                attributionControl={!isCapture}
                className="h-full w-full rounded-lg z-0 transition-opacity duration-300"
                style={{ height: "100%", width: "100%", minHeight: isFullScreen ? "100%" : "300px" }}
            >
                <MapResizer isFullScreen={isFullScreen} />
                <TileLayer url={tileUrl} />
                <Marker
                    position={[latitude, longitude]}
                    icon={getIcon(status, customPinUrl)}
                >
                    {!isCapture && (
                        <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                            <div className="font-bold text-xs uppercase tracking-tight">
                                {projectName}
                            </div>
                        </Tooltip>
                    )}
                </Marker>
            </MapContainer>
        </div>
    );

    if (isFullScreen) {
        return <Portal>{mapContent}</Portal>;
    }

    return mapContent;
}
