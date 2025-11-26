// src/lib/mapbox.ts
import mapboxgl from "mapbox-gl";

const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!accessToken) {
  console.warn(
    "NO VITE_MAPBOX_ACCESS_TOKEN"
  );
}

mapboxgl.accessToken = accessToken || "";

export default mapboxgl;
