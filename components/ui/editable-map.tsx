"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React, { useEffect, useState, useRef } from "react";

// Fix for default Leaflet marker icons in Next.js
interface IconDefaultPrototype extends L.Icon.Default {
  _getIconUrl?: string;
}
delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
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
  onPositionChange: (lat: number, lng: number, isFinal?: boolean) => void;
};

// Component to handle marker dragging
function DraggableMarker({
  position,
  onPositionChange
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number, isFinal?: boolean) => void;
}) {
  const [markerPosition, setMarkerPosition] = useState<[number, number]>(position);
  const markerRef = useRef<L.Marker>(null);

  // Update marker position when props change
  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    // Update in real-time while dragging (isFinal = false)
    drag() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        setMarkerPosition([newPos.lat, newPos.lng]);
        onPositionChange(newPos.lat, newPos.lng, false);
      }
    },
    // Only update history when drag ends (isFinal = true)
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        setMarkerPosition([newPos.lat, newPos.lng]);
        onPositionChange(newPos.lat, newPos.lng, true);
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
function MapViewController({ center, zoomRef }: { center: [number, number]; zoomRef: React.MutableRefObject<number | null> }) {
  const map = useMapEvents({
    zoomend() {
      // Mémoriser le zoom choisi par l'utilisateur
      zoomRef.current = map.getZoom();
    },
  });

  useEffect(() => {
    // Utiliser le zoom mémorisé ou le zoom actuel, mais ne pas changer le zoom
    const currentZoom = zoomRef.current || map.getZoom();
    map.setView(center, currentZoom, { animate: true });
  }, [center, map, zoomRef]);

  return null;
}

export default function EditableMap({ latitude, longitude, onPositionChange }: EditableMapProps) {
  const [center, setCenter] = useState<[number, number]>([latitude, longitude]);
  // Référence pour mémoriser le zoom choisi par l'utilisateur
  const zoomRef = useRef<number | null>(null);

  // Mettre à jour le centre quand les coordonnées changent depuis l'extérieur
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
      <MapViewController center={center} zoomRef={zoomRef} />
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
