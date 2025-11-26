import React from "react";

export interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleMapPreviewProps {
  center: LatLng | null;
  zoom?: number;
  height?: string;
}

const GoogleMapPreview: React.FC<GoogleMapPreviewProps> = ({
  center,
  zoom = 15,
  height = "320px",
}) => {
  if (!center) {
    return (
      <div
        style={{ width: "100%", height }}
        className="rounded-lg border border-slate-200 flex items-center justify-center text-sm text-slate-500 bg-slate-50"
      >
        Location haijawekwa bado.
      </div>
    );
  }

  const { lat, lng } = center;

  const src = `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div
      className="rounded-lg overflow-hidden border border-slate-200 shadow-sm"
      style={{ width: "100%", height }}
    >
      <iframe
        title="Google Map Preview"
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
};

export default GoogleMapPreview;
