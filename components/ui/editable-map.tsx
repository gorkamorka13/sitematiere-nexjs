"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { getIcon } from "@/lib/map-icons";
import { useMap, useMapEvents, MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default Leaflet marker icons in Next.js
if (typeof window !== 'undefined') {
  try {
    const DefaultIcon = (L.Icon.Default as unknown) as { prototype: { _getIconUrl?: string } };
    if (DefaultIcon.prototype) {
      delete DefaultIcon.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
    }
  } catch (e) {
    console.warn("Leaflet icon setup warning:", e);
  }
}

// Component to handle map resize when triggered
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    console.log("[EditableMap] MapResizer: invalidating size");
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

type EditableMapProps = {
  latitude: number;
  longitude: number;
  onPositionChange: (lat: number, lng: number, isFinal?: boolean) => void;
  status?: string;
  customPinUrl?: string;
};

// Component to handle marker dragging
function DraggableMarker({
  position,
  onPositionChange,
  status,
  customPinUrl
}: {
  position: [number, number];
  onPositionChange: (lat: number, lng: number, isFinal?: boolean) => void;
  status?: string;
  customPinUrl?: string;
}) {
  const markerRef = useRef<L.Marker>(null);

  const icon = useMemo(() => {
    try {
      return getIcon(status, customPinUrl, true);
    } catch (e) {
      console.error("[EditableMap] getIcon error:", e);
      return new L.Icon.Default();
    }
  }, [status, customPinUrl]);

  const eventHandlers = useMemo(() => ({
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
  }), [onPositionChange]);

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={icon}
    />
  );
}

function MapViewController({ center, zoomRef }: { center: [number, number]; zoomRef: React.MutableRefObject<number | null> }) {
  const map = useMapEvents({
    zoomend() {
      zoomRef.current = map.getZoom();
    },
  });

  useEffect(() => {
    if (center && center[0] !== undefined && center[1] !== undefined) {
      const currentZoom = zoomRef.current || map.getZoom() || 13;
      map.setView(center, currentZoom, { animate: true });
    }
  }, [center, map, zoomRef]);

  return null;
}

export default function EditableMap({ latitude, longitude, onPositionChange, status, customPinUrl }: EditableMapProps) {
  const [markerPos, setMarkerPos] = useState<[number, number]>([latitude || 0, longitude || 0]);
  const [viewCenter, setViewCenter] = useState<[number, number]>([latitude || 0, longitude || 0]);
  const isDraggingInternal = useRef(false);
  const zoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDraggingInternal.current) {
      console.log(`[EditableMap] Syncing pos: ${latitude}, ${longitude}`);
      setMarkerPos([latitude || 0, longitude || 0]);
      setViewCenter([latitude || 0, longitude || 0]);
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

  if (typeof window === 'undefined') return null;

  return (
    <MapContainer
      center={viewCenter}
      zoom={13}
      scrollWheelZoom={true}
      className="h-full w-full rounded-lg z-0"
      style={{ height: "300px", width: "100%" }}
    >
      <MapResizer />
      <MapViewController center={viewCenter} zoomRef={zoomRef} />
      <TileLayer
        attribution={attribution}
        url={tileUrl}
      />
      <DraggableMarker
        position={markerPos}
        onPositionChange={handlePositionChange}
        status={status}
        customPinUrl={customPinUrl}
      />
    </MapContainer>
  );
}
