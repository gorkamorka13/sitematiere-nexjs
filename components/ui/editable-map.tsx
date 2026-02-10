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
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    drag() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        onPositionChange(newPos.lat, newPos.lng, false);
      }
    },
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const newPos = marker.getLatLng();
        onPositionChange(newPos.lat, newPos.lng, true);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
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
  const [markerPos, setMarkerPos] = useState<[number, number]>([latitude, longitude]);
  const [viewCenter, setViewCenter] = useState<[number, number]>([latitude, longitude]);
  const isDraggingInternal = useRef(false);
  const zoomRef = useRef<number | null>(null);

  // Synchroniser la position du marqueur avec les props
  useEffect(() => {
    if (!isDraggingInternal.current) {
      setMarkerPos([latitude, longitude]);
      setViewCenter([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handlePositionChange = (lat: number, lng: number, isFinal?: boolean) => {
    if (isFinal !== undefined) {
      isDraggingInternal.current = !isFinal;
    }
    setMarkerPos([lat, lng]);
    onPositionChange(lat, lng, isFinal);
  };

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <MapContainer
      center={viewCenter}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg z-0"
      style={{ height: "300px", width: "100%" }}
    >
      <MapViewController center={viewCenter} zoomRef={zoomRef} />
      <TileLayer
        attribution={attribution}
        url={tileUrl}
      />
      <DraggableMarker
        position={markerPos}
        onPositionChange={handlePositionChange}
      />
    </MapContainer>
  );
}
