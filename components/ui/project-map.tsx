"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Sub-component to handle map view changes
function ChangeView({ latitude, longitude, zoom, nonce }: { latitude: number; longitude: number; zoom: number; nonce?: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([latitude, longitude], zoom, { animate: true });
    }, [latitude, longitude, zoom, map, nonce]);
    return null;
}

// ... Fix for default Leaflet marker icons ...
// [retaining icon definition]
const icon = L.icon({
    iconUrl: "/images/pin/pin_done.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

type MapProps = {
    latitude: number;
    longitude: number;
    projectName?: string;
    country?: string;
    popupText?: string;
    nonce?: number;
};

export default function ProjectMap({ latitude, longitude, projectName, country, popupText, nonce }: MapProps) {
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full rounded-lg z-0"
            style={{ height: "100%", width: "100%", minHeight: "300px" }}
        >
            <ChangeView latitude={latitude} longitude={longitude} zoom={13} nonce={nonce} />
            <TileLayer
                attribution={attribution}
                url={tileUrl}
            />
            <Marker position={[latitude, longitude]} icon={icon}>
                <Popup>
                    <div className="text-center">
                        <strong className="block mb-1">{projectName || "Projet"}</strong>
                        <span className="text-xs text-gray-500 block mb-1">{country || "Emplacement"}</span>
                        {popupText && !projectName && <span className="text-xs italic text-gray-400">{popupText}</span>}
                    </div>
                </Popup>
            </Marker>
        </MapContainer>
    );
}
