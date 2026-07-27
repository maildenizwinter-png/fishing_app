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

// Standard-Icon explizit erzeugen. WICHTIG: niemals icon={undefined} an <Marker>
// geben – das überschreibt Leaflets Default mit undefined und crasht (undefined.createIcon()).
const defaultIcon = new L.Icon.Default();

// Eigenes Icon für Begleiter-Fänge (gelber Pin mit 👥)
const foreignIcon = L.divIcon({
  className: "",
  html: `<div style="background:#eab308;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:12px;line-height:1;">👥</span></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -24],
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
        <Marker key={c.id} position={[c.latitude, c.longitude]} icon={c.is_foreign ? foreignIcon : defaultIcon}>
          <Popup>
            <div style={{ minWidth: "150px" }}>
              {c.is_foreign && (
                <div style={{ color: "#a16207", fontWeight: 600, marginBottom: "2px" }}>
                  👥 Begleiter{c.angler_name ? `: ${c.angler_name}` : ""}
                </div>
              )}
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