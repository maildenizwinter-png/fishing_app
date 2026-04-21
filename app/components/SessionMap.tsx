"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const formatTime = (date: string) => {
  if (!date) return "-";
  return new Date(date + "Z").toLocaleTimeString("de-DE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
};

const formatLogTime = (date: string) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("de-DE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
};

const formatCatchTime = (date: string) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleTimeString("de-DE", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
};

export default function SessionMap({
  session,
  catches,
  logs,
}: {
  session: any;
  catches: any[];
  logs: any[];
}) {
  // Session-Logs mit GPS filtern und sortieren
  const logsWithGps = logs
    .filter((l) => l.latitude && l.longitude)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Route als Linie: Start → Logs → Ende
  const routePoints: [number, number][] = [];
  if (session?.latitude && session?.longitude) {
    routePoints.push([session.latitude, session.longitude]);
  }
  logsWithGps.forEach((l) => routePoints.push([l.latitude, l.longitude]));

  // Letzter Log als Ende-Pin
  const lastLog = logsWithGps.length > 0 ? logsWithGps[logsWithGps.length - 1] : null;

  // Alle Punkte für Kartenmitte
  const allPoints: [number, number][] = [...routePoints];
  catches.forEach((c) => {
    if (c.latitude && c.longitude) allPoints.push([c.latitude, c.longitude]);
  });

  if (allPoints.length === 0) return null;

  const centerLat = allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length;
  const centerLon = allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length;

  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Route als rote Linie */}
      {routePoints.length > 1 && (
        <Polyline positions={routePoints} color="red" weight={2} opacity={0.6} dashArray="5,8" />
      )}

      {/* Session Start Pin – Grün */}
      {session?.latitude && session?.longitude && (
        <Marker position={[session.latitude, session.longitude]} icon={greenIcon}>
          <Popup>
            <div style={{ minWidth: "160px" }}>
              <strong>🟢 Session Start</strong><br />
              <span>📍 {session.location}</span><br />
              <span>🕒 {formatTime(session.start_time)}</span><br />
              {session.pressure && <span>💨 {session.pressure} hPa</span>}
              {session.temperature && <><br /><span>🌡️ {session.temperature}°C</span></>}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Fang Pins – Blau (Standard) */}
      {catches.map((c) => {
        if (!c.latitude || !c.longitude) return null;
        return (
          <Marker key={c.id} position={[c.latitude, c.longitude]}>
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <strong>🐟 {c.fish}</strong>
                {c.sub_fish && <span> ({c.sub_fish})</span>}<br />
                {c.length_cm && <span>📏 {c.length_cm} cm</span>}
                {c.weight_g && <span>  ⚖️ {c.weight_g} g</span>}<br />
                <span>🕒 {formatCatchTime(c.created_at)}</span><br />
                {c.pressure && <span>💨 {c.pressure} hPa</span>}
                {c.status && <><br /><span>{c.status === "Zurückgesetzt" ? "🔵" : "🟠"} {c.status}</span></>}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Letzter Session-Log als Ende-Pin – Rot */}
      {lastLog && (
        <Marker position={[lastLog.latitude, lastLog.longitude]} icon={redIcon}>
          <Popup>
            <div style={{ minWidth: "160px" }}>
              <strong>🔴 Session Ende</strong><br />
              <span>🕒 {formatLogTime(lastLog.created_at)}</span><br />
              {lastLog.pressure && <span>💨 {lastLog.pressure} hPa</span>}
              {lastLog.temperature && <><br /><span>🌡️ {lastLog.temperature}°C</span></>}
            </div>
          </Popup>
        </Marker>
      )}

    </MapContainer>
  );
}