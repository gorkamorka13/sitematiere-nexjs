"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

// Fix for default Leaflet marker icons in Next.js/React
const icon = L.icon({
    iconUrl: "/images/pin/pin_done.png", // Use one of the existing pins we migrated
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

    // Ensure we run only on client (Leaflet requires window)
    // Dynamic import in parent is also an option, but this component is "use client"

    return (
        <MapContainer
            center={[latitude, longitude]}
            zoom={13}
            scrollWheelZoom={false}
            className="h-full w-full rounded-lg z-0"
            style={{ height: "100%", width: "100%", minHeight: "300px" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]} icon={icon}>
                <Popup>
                    {popupText || "Project Location"}
                </Popup>
            </Marker>
        </MapContainer>
    );
}
