"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft, X, User, Clock, Flag, Cloud, Thermometer, Wind, Map,
  ChevronUp, ChevronDown, Fish, Plus, Ruler, Scale, Droplet,
  Waves, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from "recharts";
import { fetchWaterInfo, formatDischarge, WaterInfo } from "../../../lib/water";

const SessionMap = dynamic(() => import("../../components/SessionMap"), { ssr: false });

export default function SessionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [catches, setCatches] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [chartMode, setChartMode] = useState<"druck" | "temp">("druck");
  const [waterInfo, setWaterInfo] = useState<WaterInfo | null>(null);

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

  useEffect(() => {
    if (session?.latitude && session?.longitude) {
      fetchWaterInfo(session.latitude, session.longitude).then(setWaterInfo);
    } else {
      setWaterInfo(null);
    }
  }, [session?.latitude, session?.longitude]);

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

    if (session?.start_time) {
      const val = chartMode === "druck" ? session.pressure : session.temperature;
      if (val) {
        points.push({
          time: new Date(session.start_time + "Z").toLocaleTimeString("de-DE", {
            hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
          }),
          wert: val,
          fang: null,
          timestamp: new Date(session.start_time).getTime(),
        });
      }
    }

    logs.forEach((log) => {
      if (!log.created_at) return;
      const val = chartMode === "druck" ? log.pressure : log.temperature;
      if (!val) return;
      const t = new Date(log.created_at);
      points.push({
        time: t.toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }),
        wert: val,
        fang: null,
        timestamp: t.getTime(),
      });
    });

    catches.forEach((c) => {
      if (!c.created_at) return;
      const val = chartMode === "druck" ? c.pressure : c.temperature;
      if (!val) return;
      const t = new Date(c.created_at.replace(" ", "T"));
      points.push({
        time: t.toLocaleTimeString("de-DE", {
          hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin"
        }),
        wert: val,
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
          <circle cx={cx} cy={cy} r={8} fill="#14b8a6" stroke="#fff" strokeWidth={2} />
          <text x={cx} y={cy - 14} textAnchor="middle" fill="#fff" fontSize={12}>🐟</text>
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={3} fill={chartMode === "druck" ? "#f59e0b" : "#10b981"} />;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm">
          <p className="text-gray-400">{d.time}</p>
          <p className="text-white font-bold">
            {d.wert} {chartMode === "druck" ? "hPa" : "°C"}
          </p>
          {d.fang && <p className="text-teal-400">🐟 {d.fang}</p>}
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
            className="absolute top-4 right-4 bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center"
            onClick={() => setGalleryImage(null)}
          ><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* ZURÜCK */}
      <div className="pt-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition flex items-center gap-1">
          <ArrowLeft className="w-5 h-5" /> Zurück
        </button>
      </div>

      {/* SESSION INFO */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white font-semibold text-xl">{session.location}</p>
            <p className="text-gray-400 text-sm flex items-center gap-1.5"><User className="w-4 h-4" strokeWidth={1.75} /> {session.companion || "Alleine"}</p>
          </div>
          <span className="text-gray-400 text-sm flex items-center gap-1"><Clock className="w-4 h-4" strokeWidth={1.75} /> {formatDuration(session.start_time, session.end_time)}</span>
        </div>

        <div className="flex gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> Start: {formatTime(session.start_time)}</span>
          {session.end_time && <span className="flex items-center gap-1"><Flag className="w-3.5 h-3.5" strokeWidth={1.75} /> Ende: {formatTime(session.end_time)}</span>}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          {session.weather && <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5" strokeWidth={1.75} /> {session.weather}</span>}
          {session.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" strokeWidth={1.75} /> {session.temperature}°C</span>}
          {session.pressure && <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" strokeWidth={1.75} /> {session.pressure} hPa</span>}
        </div>
      </div>

      {/* WASSERFÜHRUNG */}
      {(session.river_discharge != null || waterInfo?.current != null) && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold flex items-center gap-2"><Waves className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Wasserführung</h2>
            {waterInfo?.trend && (
              <span className="inline-flex items-center gap-1 text-sm text-gray-300">
                {waterInfo.trend === "steigend" ? <TrendingUp className="w-4 h-4 text-sky-400" /> : waterInfo.trend === "fallend" ? <TrendingDown className="w-4 h-4 text-teal-400" /> : <Minus className="w-4 h-4 text-gray-400" />}
                {waterInfo.trend}
              </span>
            )}
          </div>
          {session.river_discharge != null && (
            <p className="text-gray-400 text-sm">Zur Session-Zeit: <span className="text-white">{formatDischarge(session.river_discharge)}</span></p>
          )}
          {waterInfo?.current != null && (
            <p className="text-gray-400 text-sm">Aktuell: <span className="text-white">{formatDischarge(waterInfo.current)}</span></p>
          )}
          {waterInfo?.series && waterInfo.series.length > 1 && (
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={waterInfo.series}>
                <YAxis hide domain={["dataMin", "dataMax"]} />
                <Line type="monotone" dataKey="value" stroke="#2dd4bf" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
          <p className="text-gray-600 text-xs">Modellierte Wasserführung · kein amtlicher cm-Pegel</p>
        </div>
      )}

      {/* KARTEN BUTTON */}
      {hasMapData && (
        <button
          onClick={() => setShowMap(!showMap)}
          className="w-full bg-teal-600 hover:bg-teal-500 transition rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Map className="w-5 h-5 text-white" strokeWidth={1.75} />
            <div className="text-left">
              <p className="text-white font-semibold">Kartenansicht</p>
              <p className="text-teal-100/80 text-sm">Start, Fänge und Ende auf der Karte</p>
            </div>
          </div>
          {showMap ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-white" />}
        </button>
      )}

      {/* KARTE */}
      {showMap && hasMapData && (
        <div className="rounded-2xl overflow-hidden" style={{ height: "350px" }}>
          <SessionMap session={session} catches={catches} logs={logs} />
        </div>
      )}

      {/* VERLAUF CHART mit Toggle */}
      {chartData.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">

          {/* Toggle Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setChartMode("druck")}
              className={`font-medium text-base transition flex items-center gap-1.5 ${
                chartMode === "druck" ? "text-amber-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Wind className="w-4 h-4" strokeWidth={1.75} /> Luftdruck
            </button>
            <span className="text-gray-700">|</span>
            <button
              onClick={() => setChartMode("temp")}
              className={`font-medium text-base transition flex items-center gap-1.5 ${
                chartMode === "temp" ? "text-emerald-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Thermometer className="w-4 h-4" strokeWidth={1.75} /> Temperatur
            </button>
          </div>

          <p className="text-gray-500 text-xs">Fisch-Symbol = Fang bei diesem Wert</p>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                unit={chartMode === "druck" ? " hPa" : " °C"}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="wert"
                stroke={chartMode === "druck" ? "#f59e0b" : "#10b981"}
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
          <h2 className="text-white font-semibold text-lg flex items-center gap-2"><Fish className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Fänge ({catches?.length ?? 0})</h2>
          <Link href="/new">
            <button className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1.5 rounded-xl text-sm transition flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Fang
            </button>
          </Link>
        </div>

        {catches?.length === 0 && (
          <p className="text-gray-500 text-sm">Noch keine Fänge für diese Session</p>
        )}

        {catches?.map((c: any) => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
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
                  <p className="text-white font-semibold">
                    {c.fish}
                    {c.sub_fish && <span className="text-gray-400 font-normal text-sm ml-2">{c.sub_fish}</span>}
                  </p>
                  <div className="flex items-center gap-3 text-gray-400 text-sm mt-0.5">
                    {c.length_cm ? <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.length_cm} cm</span> : null}
                    {c.weight_g ? <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.weight_g} g</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    c.status === "Zurückgesetzt"
                      ? "bg-blue-500/15 text-blue-400"
                      : "bg-orange-500/15 text-orange-400"
                  }`}>
                    {c.status || "-"}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{formatCatchTime(c.created_at)}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
                {c.method && <span className="flex items-center gap-1"><Fish className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.method}</span>}
                {c.bait && <span className="text-gray-500">{c.bait}</span>}
                {c.water_temp && <span className="flex items-center gap-1"><Droplet className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.water_temp}°C Wasser</span>}
                {c.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.temperature}°C Luft</span>}
                {c.pressure && <span className="flex items-center gap-1"><Wind className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.pressure} hPa</span>}
                {c.weather && <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5" strokeWidth={1.75} /> {c.weather}</span>}
              </div>

              {c.notes && <p className="text-gray-500 text-sm italic">"{c.notes}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}