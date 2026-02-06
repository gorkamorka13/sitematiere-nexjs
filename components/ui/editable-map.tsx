"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState, useRef } from "react";

// Fix for default Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Use default Leaflet icon (blue marker)
const editableIcon = new L.Icon.Default();

type EditableMapProps = {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number) => void;
};

// Component to handle marker dragging
function DraggableMarker({
  position,
  onPositionChange
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position);
  const markerRef = useRef<L.Marker>(null);

  // Update marker position when props change
  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    // Update in real-time while dragging
    drag() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        setMarkerPosition([newPos.lat, newPos.lng]);
        onPositionChange(newPos.lat, newPos.lng);
      }
    },
    // Also update when drag ends (for consistency)
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        setMarkerPosition([newPos.lat, newPos.lng]);
        onPositionChange(newPos.lat, newPos.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={markerPosition}
      ref={markerRef}
      icon={editableIcon}
    />
  );
}

// Component to handle map view updates
function MapViewController({ center }: { center: [number, number] }) {
  const map = useMapEvents({});

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

export default function EditableMap({ latitude, longitude, onPositionChange }: EditableMapProps) {
  const [center, setCenter] = useState<[number, number]>([latitude, longitude]);

  // Update center when coordinates change externally
  useEffect(() => {
    setCenter([latitude, longitude]);
  }, [latitude, longitude]);

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg z-0"
      style={{ height: "300px", width: "100%" }}
    >
      <MapViewController center={center} />
      <TileLayer
        attribution={attribution}
        url={tileUrl}
      />
      <DraggableMarker
        position={center}
        onPositionChange={onPositionChange}
      />
    </MapContainer>
  );
}
