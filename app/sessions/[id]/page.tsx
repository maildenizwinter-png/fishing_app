"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from "recharts";

const SessionMap = dynamic(() => import("../../components/SessionMap"), { ssr: false });

export default function SessionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [catches, setCatches] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const load = async () => {
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id)
      .single();
    setSession(sessionData);

    const { data: catchData } = await supabase
      .from("catches")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });
    setCatches(catchData || []);

    const { data: logData } = await supabase
      .from("session_logs")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: true });
    setLogs(logData || []);
  };

  useEffect(() => {
    load();
  }, [id]);

  const formatTime = (date: string) => {
    return new Date(date + "Z").toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMin = Math.floor((endTime - startTime) / (1000 * 60));
    if (diffMin < 0) return "0h 0min";
    return `${Math.floor(diffMin / 60)}h ${diffMin % 60}min`;
  };

  const formatCatchTime = (date: string) => {
    if (!date) return "-";
    return new Date(date.replace(" ", "T")).toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  };

  const buildChartData = () => {
    const points: any[] = [];

    if (session?.pressure && session?.start_time) {
      points.push({
        time: new Date(session.start_time + "Z").toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }),
        druck: session.pressure,
        fang: null,
        timestamp: new Date(session.start_time).getTime(),
      });
    }

    logs.forEach((log) => {
      if (!log.pressure || !log.created_at) return;
      const t = new Date(log.created_at);
      points.push({
        time: t.toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }),
        druck: log.pressure,
        fang: null,
        timestamp: t.getTime(),
      });
    });

    catches.forEach((c) => {
      if (!c.pressure || !c.created_at) return;
      const t = new Date(c.created_at.replace(" ", "T"));
      points.push({
        time: t.toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }),
        druck: c.pressure,
        fang: c.fish,
        timestamp: t.getTime(),
      });
    });

    return points.sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartData = buildChartData();

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.fang) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
          <text x={cx} y={cy - 14} textAnchor="middle" fill="#fff" fontSize={12}>🐟</text>
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={3} fill="#f59e0b" />;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm">
          <p className="text-gray-400">{d.time}</p>
          <p className="text-white font-bold">{d.druck} hPa</p>
          {d.fang && <p className="text-blue-400">🐟 {d.fang}</p>}
        </div>
      );
    }
    return null;
  };

  const hasMapData =
    (session?.latitude && session?.longitude) ||
    catches.some((c) => c.latitude && c.longitude);

  if (!session) return <div className="p-4 text-gray-400">Laden...</div>;

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      {/* GALERIE MODAL */}
      {galleryImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setGalleryImage(null)}
        >
          <img src={galleryImage} alt="Fang" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-4 right-4 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl"
            onClick={() => setGalleryImage(null)}
          >✕</button>
        </div>
      )}

      {/* ZURÜCK */}
      <div className="pt-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
          ← Zurück
        </button>
      </div>

      {/* SESSION INFO */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white font-bold text-xl">{session.location}</p>
            <p className="text-gray-400 text-sm">👤 {session.companion || "Alleine"}</p>
          </div>
          <span className="text-gray-400 text-sm">⏱️ {formatDuration(session.start_time, session.end_time)}</span>
        </div>

        <div className="flex gap-3 text-xs text-gray-400">
          <span>🕒 Start: {formatTime(session.start_time)}</span>
          {session.end_time && <span>🛑 Ende: {formatTime(session.end_time)}</span>}
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-gray-400">
          {session.weather && <span>🌦️ {session.weather}</span>}
          {session.temperature && <span>🌡️ {session.temperature}°C</span>}
          {session.pressure && <span>💨 {session.pressure} hPa</span>}
        </div>
      </div>

      {/* KARTEN BUTTON */}
      {hasMapData && (
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full bg-blue-600 hover:bg-blue-500 transition rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="text-white font-bold">🗺️ Kartenansicht</p>
            <p className="text-blue-200 text-sm">Start, Fänge und Ende auf der Karte</p>
          </div>
          <span className="text-white text-xl">{showMap ? "▲" : "▼"}</span>
        </button>
      )}

      {/* KARTE */}
      {showMap && hasMapData && (
        <div className="rounded-2xl overflow-hidden" style={{ height: "350px" }}>
         <SessionMap session={session} catches={catches} logs={logs} />
        </div>
      )}

      {/* LUFTDRUCK CHART */}
      {chartData.length > 1 && (
        <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-white font-bold">💨 Luftdruckverlauf</h2>
          <p className="text-gray-500 text-xs">🐟 = Fang bei diesem Luftdruck</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#9ca3af", fontSize: 10 }} unit=" hPa" width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="druck"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={<CustomDot />}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* FÄNGE */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">🐟 Fänge ({catches?.length ?? 0})</h2>
          <Link href="/new">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-xl text-sm transition">
              ➕ Fang
            </button>
          </Link>
        </div>

        {catches?.length === 0 && (
          <p className="text-gray-500 text-sm">Noch keine Fänge für diese Session</p>
        )}

        {catches?.map((c: any) => (
          <div key={c.id} className="bg-gray-800 rounded-2xl overflow-hidden">
            {c.image_url && (
              <img
                src={c.image_url}
                alt={c.fish}
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition"
                onClick={() => setGalleryImage(c.image_url)}
              />
            )}
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white font-bold">
                    {c.fish}
                    {c.sub_fish && <span className="text-gray-400 font-normal text-sm ml-2">{c.sub_fish}</span>}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {c.length_cm ? `📏 ${c.length_cm} cm` : ""}
                    {c.weight_g ? `  ⚖️ ${c.weight_g} g` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.status === "Zurückgesetzt"
                      ? "bg-blue-600/20 text-blue-400"
                      : "bg-orange-600/20 text-orange-400"
                  }`}>
                    {c.status || "-"}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{formatCatchTime(c.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {c.method && <span>🎣 {c.method}</span>}
                {c.bait && <span>🪱 {c.bait}</span>}
                {c.water_temp && <span>💧 {c.water_temp}°C Wasser</span>}
                {c.temperature && <span>🌡️ {c.temperature}°C Luft</span>}
                {c.pressure && <span>💨 {c.pressure} hPa</span>}
                {c.weather && <span>🌦️ {c.weather}</span>}
              </div>

              {c.notes && <p className="text-gray-500 text-sm italic">"{c.notes}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}