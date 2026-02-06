"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Sub-component to handle map view changes
function ChangeView({ latitude, longitude, zoom }: { latitude: number; longitude: number; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView([latitude, longitude], zoom, { animate: true });
    }, [latitude, longitude, zoom, map]);
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
    popupText?: string;
};

export default function ProjectMap({ latitude, longitude, popupText }: MapProps) {
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
            <ChangeView latitude={latitude} longitude={longitude} zoom={13} />
            <TileLayer
                attribution={attribution}
                url={tileUrl}
            />
            <Marker position={[latitude, longitude]} icon={icon}>
                <Popup>
                    {popupText || "Project Location"}
                </Popup>
            </Marker>
        </MapContainer>
    );
}
