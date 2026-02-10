"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { getIcon } from "@/lib/map-icons";

// Sub-component to handle map view changes
function ChangeView({ latitude, longitude, zoom, nonce }: { latitude: number; longitude: number; zoom: number; nonce?: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([latitude, longitude], zoom, { animate: true });
    }, [latitude, longitude, zoom, map, nonce]);
    return null;
}


type MapProps = {
    latitude: number;
    longitude: number;
    status?: string | null;
    projectName?: string;
    country?: string;
    popupText?: string;
    nonce?: number;
    isCapture?: boolean;
};

export default function ProjectMap({ latitude, longitude, status, projectName, country, popupText, nonce, isCapture }: MapProps) {
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            scrollWheelZoom={false}
            zoomControl={!isCapture}
            attributionControl={!isCapture}
            preferCanvas={!isCapture}
            className="h-full w-full rounded-lg z-0"
            style={{ height: "100%", width: "100%", minHeight: "300px" }}
        >
            <ChangeView latitude={latitude} longitude={longitude} zoom={13} nonce={nonce} />
            <TileLayer
                url={tileUrl}
            />
            <Marker position={[latitude, longitude]} icon={getIcon(status)}>
                {!isCapture && (
                    <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                        <div className="text-center p-1">
                            <strong className="block text-sm mb-0.5">{projectName || "Projet"}</strong>
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block mb-1 opacity-80">{country || "Emplacement"}</span>
                            <div className="w-full h-px bg-gray-100 dark:bg-gray-700 my-1" />
                            <span className="text-[10px] font-mono text-gray-400 block italic leading-none">
                                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                            </span>
                        </div>
                    </Tooltip>
                )}
            </Marker>
        </MapContainer>
    );
}
