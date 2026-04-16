"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Link from "next/link";

export default function Home() {
  const [fishCount, setFishCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalTime, setTotalTime] = useState("");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionCatches, setSessionCatches] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    loadData();
  }, []);

  const logWeather = async (sessionId: number) => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
          );
          const data = await res.json();

          await supabase.from("session_logs").insert([{
            session_id: sessionId,
            created_at: new Date().toISOString(),
            latitude: lat,
            longitude: lon,
            temperature: data.main?.temp ?? null,
            pressure: data.main?.pressure ?? null,
            weather: data.weather?.[0]?.main ?? null,
          }]);

          console.log("🌦️ Wetter-Log gespeichert");
        } catch {
          console.log("Wetter-Log fehlgeschlagen");
        }
      },
      () => console.log("GPS nicht verfügbar")
    );
  };

  const loadData = async () => {
    const { data: sessions } = await supabase.from("sessions").select("*");
    if (!sessions) return;

    const sessionsThisYear = sessions.filter((s: any) =>
      s.start_time?.startsWith(currentYear.toString())
    );
    setSessionCount(sessionsThisYear.length);

    let totalMinutes = 0;
    sessionsThisYear.forEach((s: any) => {
      if (!s.start_time) return;
      const start = new Date(s.start_time).getTime();
      const end = s.end_time ? new Date(s.end_time).getTime() : Date.now();
      let diffMinutes = Math.floor((end - start) / (1000 * 60));
      if (diffMinutes > 0 && diffMinutes < 24 * 60) totalMinutes += diffMinutes;
    });

    setTotalTime(`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`);

    const { data: catches } = await supabase.from("catches").select("*");
    if (catches) {
      setFishCount(catches.filter((c: any) =>
        c.created_at?.slice(0, 4) === currentYear.toString()
      ).length);
    }

    const storedId = localStorage.getItem("activeSessionId");
    if (storedId) {
      const { data } = await supabase
        .from("sessions").select("*").eq("id", storedId).single();
      setActiveSession(data);

      const { data: sc } = await supabase
        .from("catches").select("*").eq("session_id", storedId)
        .order("created_at", { ascending: false });
      setSessionCatches(sc || []);

      // 🌦️ Wetter beim App-Laden loggen
      logWeather(Number(storedId));
    } else {
      setActiveSession(null);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;
    if (!confirm("Session wirklich beenden?")) return;
    await supabase.from("sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("id", activeSession.id);
    localStorage.removeItem("activeSessionId");
    setActiveSession(null);
    loadData();
  };

  const formatTime = (date: string) => {
    return new Date(date + "Z").toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
    });
  };

  const formatCatchTime = (date: string) => {
    if (!date) return "-";
    return new Date(date.replace(" ", "T")).toLocaleTimeString("de-DE", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
    });
  };

  const getDuration = (start: string) => {
    let min = Math.floor((Date.now() - new Date(start).getTime()) / 60000) - 120;
    if (min < 0) min = 0;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="pt-4">
        <p className="text-gray-400 text-sm">Willkommen zurück 👋</p>
        <h1 className="text-2xl font-bold text-white">Dashboard {currentYear}</h1>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/catches">
          <div className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1 hover:bg-gray-700 transition">
            <span className="text-2xl">🐟</span>
            <span className="text-xl font-bold text-white">{fishCount}</span>
            <span className="text-xs text-gray-400">Fische</span>
          </div>
        </Link>

        <Link href="/sessions">
          <div className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1 hover:bg-gray-700 transition">
            <span className="text-2xl">🎣</span>
            <span className="text-xl font-bold text-white">{sessionCount}</span>
            <span className="text-xs text-gray-400">Sessions</span>
          </div>
        </Link>

        <div className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center gap-1">
          <span className="text-2xl">⏱️</span>
          <span className="text-xl font-bold text-white">{totalTime}</span>
          <span className="text-xs text-gray-400">Zeit am Wasser</span>
        </div>
      </div>

      {/* AKTIVE SESSION oder START BUTTON */}
      {!activeSession ? (
        <Link href="/session">
          <div className="bg-blue-600 hover:bg-blue-500 transition rounded-2xl p-5 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-white font-bold text-lg">Neue Session</p>
              <p className="text-blue-200 text-sm">Angelzeit starten</p>
            </div>
            <span className="text-3xl">▶️</span>
          </div>
        </Link>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-4 space-y-4 border border-red-500/30">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-400 font-semibold text-sm">Laufende Session</span>
            </div>
            <span className="text-gray-400 text-sm">{getDuration(activeSession.start_time)}</span>
          </div>

          <div>
            <p className="text-white font-bold">🎣 {activeSession.location}</p>
            <p className="text-gray-400 text-sm">🕒 Start: {formatTime(activeSession.start_time)}</p>
          </div>

          {/* Fänge */}
          <div className="space-y-2">
            <p className="text-gray-400 text-xs uppercase tracking-wider">Fänge dieser Session</p>
            {sessionCatches.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Fänge</p>
            ) : (
              sessionCatches.map((c: any) => (
                <div key={c.id} className="bg-gray-700 rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-white font-semibold">{c.fish}</p>
                    <p className="text-gray-400 text-xs">{c.length_cm ? `${c.length_cm} cm` : ""} • {c.status}</p>
                  </div>
                  <p className="text-gray-500 text-xs">{formatCatchTime(c.created_at)}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Link href="/new" className="flex-1">
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-xl text-sm transition">
                ➕ Fang hinzufügen
              </button>
            </Link>
            <button
              onClick={endSession}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl text-sm transition"
            >
              ⏹️ Beenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
}