"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import * as XLSX from "xlsx";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function StatsPage() {
  const [catches, setCatches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: catchData } = await supabase
      .from("catches")
      .select("*, sessions(location, pressure)")
      .order("created_at", { ascending: true });

    const { data: sessionData } = await supabase
      .from("sessions")
      .select("*, catches(count)")
      .order("start_time", { ascending: true });

    const { data: logData } = await supabase
      .from("session_logs")
      .select("*")
      .order("created_at", { ascending: true });

    setCatches(catchData || []);
    setSessions(sessionData || []);
    setLogs(logData || []);
    setLoading(false);
  };

  const exportExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const cleaned = data.map((row) => {
      const newRow: any = {};
      Object.entries(row).forEach(([key, val]) => {
        newRow[key] = typeof val === "object" ? JSON.stringify(val) : val;
      });
      return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(cleaned);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daten");
    XLSX.writeFile(wb, filename);
  };

  if (loading) return <div className="p-4 text-gray-400">Laden...</div>;
  if (catches.length === 0) return <div className="p-4 text-gray-400">Noch keine Fänge vorhanden.</div>;

  // 🐟 Fische pro Gewässer
  const perLocation: Record<string, number> = {};
  catches.forEach((c) => {
    const loc = c.sessions?.location || "Unbekannt";
    perLocation[loc] = (perLocation[loc] || 0) + 1;
  });
  const locationData = Object.entries(perLocation).map(([name, count]) => ({ name, count }));

  // 📅 Fische pro Monat
  const perMonth: Record<string, number> = {};
  catches.forEach((c) => {
    if (!c.created_at) return;
    const d = new Date(c.created_at.replace(" ", "T"));
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    perMonth[key] = (perMonth[key] || 0) + 1;
  });
  const monthData = Object.entries(perMonth).map(([name, count]) => ({ name, count }));

  // 🌦️ Wetter bei Fängen
  const perWeather: Record<string, number> = {};
  catches.forEach((c) => {
    const w = c.weather || "Unbekannt";
    perWeather[w] = (perWeather[w] || 0) + 1;
  });
  const weatherData = Object.entries(perWeather).map(([name, value]) => ({ name, value }));

  // 💨 Luftdruck bei Fängen
  const pressureData = catches
    .filter((c) => c.pressure && c.created_at)
    .map((c) => {
      const d = new Date(c.created_at.replace(" ", "T"));
      return {
        name: `${d.getDate()}.${d.getMonth() + 1}`,
        druck: c.pressure,
      };
    });

  // 🕒 Beste Tageszeit
  const perHour: Record<string, number> = {};
  catches.forEach((c) => {
    if (!c.created_at) return;
    const d = new Date(c.created_at.replace(" ", "T"));
    const hour = `${d.getHours()}:00`;
    perHour[hour] = (perHour[hour] || 0) + 1;
  });
  const hourData = Object.entries(perHour)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([name, count]) => ({ name, count }));

  // 📏 Größter Fang pro Fischart
  const perFish: Record<string, number> = {};
  catches.forEach((c) => {
    if (!c.fish || !c.length_cm) return;
    if (!perFish[c.fish] || c.length_cm > perFish[c.fish]) {
      perFish[c.fish] = c.length_cm;
    }
  });
  const fishSizeData = Object.entries(perFish)
    .map(([name, cm]) => ({ name, cm }))
    .sort((a, b) => b.cm - a.cm);

  // ❌ Sessions ohne Fang
  const emptySession = sessions.filter((s) => s.catches?.[0]?.count === 0);

  const emptyPerLocation: Record<string, number> = {};
  emptySession.forEach((s) => {
    const loc = s.location || "Unbekannt";
    emptyPerLocation[loc] = (emptyPerLocation[loc] || 0) + 1;
  });
  const emptyLocationData = Object.entries(emptyPerLocation)
    .map(([name, count]) => ({ name, count }));

  const emptyPressureData = emptySession
    .filter((s) => s.pressure && s.start_time)
    .map((s) => {
      const d = new Date(s.start_time);
      return {
        name: `${d.getDate()}.${d.getMonth() + 1}`,
        druck: s.pressure,
      };
    });

  const emptyPerHour: Record<string, number> = {};
  emptySession.forEach((s) => {
    if (!s.start_time) return;
    const d = new Date(s.start_time);
    const hour = `${d.getHours()}:00`;
    emptyPerHour[hour] = (emptyPerHour[hour] || 0) + 1;
  });
  const emptyHourData = Object.entries(emptyPerHour)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([name, count]) => ({ name, count }));

  // 📈 Luftdrucktrend bei Fängen
  const trendCounts = { steigend: 0, fallend: 0, gleichbleibend: 0 };

  catches.forEach((c) => {
    if (!c.pressure || !c.created_at || !c.session_id) return;

    const catchTime = new Date(c.created_at.replace(" ", "T")).getTime();

    const sessionLogs = logs
      .filter((l) =>
        l.session_id === c.session_id &&
        l.pressure &&
        new Date(l.created_at).getTime() < catchTime
      )
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const sessionStart = sessions.find((s) => s.id === c.session_id);
    const allPressures: number[] = [];

    if (sessionStart?.pressure) allPressures.push(sessionStart.pressure);
    sessionLogs.forEach((l) => allPressures.push(l.pressure));

    const last3 = allPressures.slice(-3);
    if (last3.length < 2) return;

    const diff = last3[last3.length - 1] - last3[0];
    if (diff > 0.5) trendCounts.steigend++;
    else if (diff < -0.5) trendCounts.fallend++;
    else trendCounts.gleichbleibend++;
  });

  const trendData = [
    { name: "📈 Steigend", count: trendCounts.steigend, fill: "#10b981" },
    { name: "📉 Fallend", count: trendCounts.fallend, fill: "#ef4444" },
    { name: "➡️ Gleich", count: trendCounts.gleichbleibend, fill: "#f59e0b" },
  ];

  return (
    <div className="p-4 max-w-xl mx-auto space-y-8">

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">📊 Auswertung</h1>
        <p className="text-gray-400 text-sm">{catches.length} Fänge gesamt</p>
      </div>

      {/* Excel Export */}
      <div className="flex gap-3">
        <button
          onClick={() => exportExcel(catches, "faenge.xlsx")}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-sm transition"
        >
          📥 Fänge exportieren
        </button>
        <button
          onClick={() => exportExcel(sessions, "sessions.xlsx")}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-sm transition"
        >
          📥 Sessions exportieren
        </button>
      </div>

      {/* ✅ POSITIV */}
      <p className="text-green-400 font-semibold text-sm uppercase tracking-wider">✅ Wann läuft es gut?</p>

      {/* Fische pro Gewässer */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">🐟 Fische pro Gewässer</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={locationData}>
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Fische pro Monat */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">📅 Fische pro Monat</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthData}>
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Wetter bei Fängen */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">🌦️ Wetter bei Fängen</h2>
        {weatherData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Wetterdaten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={weatherData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name} (${value})`}
              >
                {weatherData.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Luftdruck bei Fängen */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">💨 Luftdruck bei Fängen</h2>
        {pressureData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Luftdruckdaten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={pressureData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Line type="monotone" dataKey="druck" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Beste Tageszeit */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">🕒 Beste Tageszeit</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourData}>
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Größter Fang pro Fischart */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">📏 Größter Fang pro Fischart</h2>
        {fishSizeData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Längendaten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fishSizeData} layout="vertical">
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} unit=" cm" />
              <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="cm" fill="#ec4899" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Luftdrucktrend */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">📈 Luftdrucktrend bei Fängen</h2>
        <p className="text-gray-500 text-xs">Basierend auf den letzten 3 Messwerten vor dem Fang</p>
        {trendData.every((t) => t.count === 0) ? (
          <p className="text-gray-500 text-sm">Nicht genug Daten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {trendData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ❌ NEGATIV */}
      <p className="text-red-400 font-semibold text-sm uppercase tracking-wider">❌ Wann läuft es schlecht?</p>

      {/* Sessions ohne Fang pro Gewässer */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">🎣 Sessions ohne Fang pro Gewässer</h2>
        {emptyLocationData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Daten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emptyLocationData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Luftdruck bei Sessions ohne Fang */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">💨 Luftdruck bei Sessions ohne Fang</h2>
        {emptyPressureData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Luftdruckdaten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={emptyPressureData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis domain={["auto", "auto"]} tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Line type="monotone" dataKey="druck" stroke="#ef4444" strokeWidth={2} dot={{ fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tageszeit bei Sessions ohne Fang */}
      <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-white font-bold">🕒 Tageszeit bei Sessions ohne Fang</h2>
        {emptyHourData.length === 0 ? (
          <p className="text-gray-500 text-sm">Keine Daten vorhanden</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={emptyHourData}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: "8px", color: "#fff" }} />
              <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}