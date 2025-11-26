// src/components/MapboxSingleMarker.tsx
import React, { useEffect, useRef } from "react";
import mapboxgl from "../lib/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

export interface LatLng {
  lat: number;
  lng: number;
}

interface MapboxSingleMarkerProps {
  initialCenter: LatLng;
  zoom?: number;
  value?: LatLng | null;
  onChange?: (coords: LatLng) => void;
  height?: string;
}

const MapboxSingleMarker: React.FC<MapboxSingleMarkerProps> = ({
  initialCenter,
  zoom = 13,
  value,
  onChange,
  height = "320px",
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!mapboxgl.accessToken) {
      console.error("Mapbox access token haipo.");
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [initialCenter.lng, initialCenter.lat],
      zoom,
    });

    mapRef.current = map;

    // Add controls
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Click to set marker
    map.on("click", (e) => {
      const coords: LatLng = {
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
      };
      if (markerRef.current) {
        markerRef.current.setLngLat([coords.lng, coords.lat]);
      } else {
        markerRef.current = new mapboxgl.Marker()
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);
      }
      onChange?.(coords);
    });

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, zoom, onChange]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([value.lng, value.lat]);
    } else {
      markerRef.current = new mapboxgl.Marker()
        .setLngLat([value.lng, value.lat])
        .addTo(map);
    }

    map.flyTo({ center: [value.lng, value.lat], zoom });
  }, [value, zoom]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height }}
      className="rounded-lg overflow-hidden shadow border border-slate-200"
    />
  );
};

export default MapboxSingleMarker;
