"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function MapView({ catches }: { catches: any[] }) {
  const center = catches.length > 0
    ? [catches[0].latitude, catches[0].longitude] as [number, number]
    : [47.7, 9.6] as [number, number];

  const goToCatch = (id: number) => {
    window.location.href = `/catches?id=${id}`;
  };

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {catches.map((c) => (
        <Marker key={c.id} position={[c.latitude, c.longitude]}>
          <Popup>
            <div style={{ minWidth: "150px" }}>
              <strong>{c.fish}</strong>
              {c.sub_fish && <span> ({c.sub_fish})</span>}
              <br />
              {c.length_cm && <span>📏 {c.length_cm} cm</span>}
              {c.weight_g && <span> ⚖️ {c.weight_g} g</span>}
              <br />
              {c.sessions?.location && <span>📍 {c.sessions.location}</span>}
              <br />
              {c.status && <span>{c.status}</span>}
              <br />
              <button
                onClick={() => goToCatch(c.id)}
                style={{
                  marginTop: "8px",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Zum Fang →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}