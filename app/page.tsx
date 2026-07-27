"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getActiveUserId } from "../lib/getUserId";
import Link from "next/link";
import {
  Fish, Waves, Clock, Play, Square, Plus, User, MapPin, Ruler,
  Scale, Thermometer, Cloud, RefreshCw, ArrowDown, Users,
} from "lucide-react";

export default function Home() {
  const [fishCount, setFishCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [totalTime, setTotalTime] = useState("");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionCatches, setSessionCatches] = useState<any[]>([]);
  const [lastCatch, setLastCatch] = useState<any>(null);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();

useEffect(() => {
    loadData();

    // Wenn Seite aus dem bfcache (z.B. Browser-Back) wiederhergestellt wird, neu laden
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
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
        } catch {
          console.log("Wetter-Log fehlgeschlagen");
        }
      },
      () => console.log("GPS nicht verfügbar"),
      { timeout: 10000 }
    );
  };

  const loadData = async () => {
    const userId = await getActiveUserId();
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    setAuthChecked(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", userId)
      .single();

    if (profile?.username) {
      setUserName(profile.username);
    } else if (profile?.full_name) {
      setUserName(profile.full_name);
    } else {
      setUserName("");
    }

    setAvatarUrl(profile?.avatar_url || null);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId);

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

    setTotalTime(`${Math.floor(totalMinutes / 60)}h`);

    const { data: catches } = await supabase
      .from("catches")
      .select("*, sessions(location)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (catches) {
      setFishCount(catches.filter((c: any) =>
        !c.is_foreign && c.created_at?.slice(0, 4) === currentYear.toString()
      ).length);
      // Letzter Fang: erster eigener Fang (Begleiter-Fänge werden übersprungen)
      setLastCatch(catches.find((c: any) => !c.is_foreign) || null);
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

      logWeather(Number(storedId));
    } else {
      setActiveSession(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 70 && !refreshing) {
      setRefreshing(true);
      setPullDistance(60);
      await loadData();
      setRefreshing(false);
    }
    setPullDistance(0);
    touchStartY.current = null;
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

  const formatCatchDate = (date: string) => {
    if (!date) return "-";
    return new Date(date.replace(" ", "T")).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  };

  const getDuration = (start: string) => {
    let min = Math.floor((Date.now() - new Date(start).getTime()) / 60000) - 120;
    if (min < 0) min = 0;
    return `${Math.floor(min / 60)}h ${min % 60}min`;
  };

  if (!authChecked) {
    return <div className="p-4 text-gray-400">Laden...</div>;
  }

  const statCards = [
    { href: "/catches", icon: Fish, value: fishCount, label: `Fische ${currentYear}` },
    { href: "/sessions", icon: Waves, value: sessionCount, label: `Sessions ${currentYear}` },
    { href: null, icon: Clock, value: totalTime, label: "am Wasser" },
  ];

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateY(${pullDistance}px)`,
        transition: pullDistance === 0 ? "transform 0.3s ease-out" : "none",
      }}
      className="p-4 max-w-xl mx-auto flex flex-col gap-4"
    >

      {(pullDistance > 0 || refreshing) && (
        <div
          className="absolute left-0 right-0 flex flex-col items-center justify-center text-gray-400 text-sm"
          style={{
            top: `-${60 - pullDistance / 2}px`,
            opacity: Math.min(pullDistance / 70, 1),
          }}
        >
          {refreshing ? (
            <RefreshCw className="w-6 h-6 mb-1 animate-spin text-teal-400" />
          ) : (
            <ArrowDown className={`w-6 h-6 mb-1 transition-transform ${pullDistance > 70 ? "rotate-180 text-teal-400" : ""}`} />
          )}
          <span>
            {refreshing ? "Lädt..." : pullDistance > 70 ? "Loslassen zum Aktualisieren" : "Weiter ziehen..."}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="pt-4 flex justify-between items-center">
        <div className="space-y-0.5">
          <p className="text-gray-500 text-sm">Willkommen zurück</p>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {userName || "Angler"}
          </h1>
        </div>
        <Link href="/profile">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profil"
              className="w-11 h-11 rounded-full object-cover hover:opacity-80 transition ring-1 ring-gray-700"
            />
          ) : (
            <div className="w-11 h-11 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition ring-1 ring-gray-700">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </Link>
      </div>

      {/* Stat-Karten */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map(({ href, icon: Icon, value, label }, i) => {
          const card = (
            <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 flex flex-col gap-3 h-full hover:border-gray-700 transition">
              <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center">
                <Icon className="w-[18px] h-[18px] text-gray-300" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <p className="text-2xl font-semibold text-white leading-none">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          );
          return href ? <Link key={i} href={href}>{card}</Link> : <div key={i}>{card}</div>;
        })}
      </div>

      {!activeSession ? (
        <Link href="/session">
          <div className="bg-teal-600 hover:bg-teal-500 transition rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-teal-900/30">
            <div>
              <p className="text-white font-semibold text-lg">Neue Session</p>
              <p className="text-teal-100/80 text-sm">Angelzeit starten</p>
            </div>
            <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-gray-900 rounded-2xl p-4 space-y-4 border border-red-500/30">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-400 font-medium text-sm">Laufende Session</span>
            </div>
            <span className="text-gray-400 text-sm tabular-nums">{getDuration(activeSession.start_time)}</span>
          </div>

          <div className="space-y-1">
            <p className="text-white font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
              {activeSession.location}
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" strokeWidth={1.75} />
              Start: {formatTime(activeSession.start_time)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Fänge dieser Session</p>
            {sessionCatches.length === 0 ? (
              <p className="text-gray-500 text-sm">Noch keine Fänge</p>
            ) : (
              sessionCatches.map((c: any) => (
                <div key={c.id} className={`bg-gray-800 rounded-xl p-3 flex justify-between items-center ${c.is_foreign ? "border border-yellow-600/40" : ""}`}>
                  <div>
                    <p className="text-white font-medium flex items-center gap-2 flex-wrap">
                      {c.fish}
                      {c.is_foreign && (
                        <span className="inline-flex items-center gap-1 text-xs bg-yellow-600/20 text-yellow-300 px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" /> {c.angler_name || "Begleiter"}
                        </span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">{c.length_cm ? `${c.length_cm} cm` : ""} {c.length_cm && c.status ? "·" : ""} {c.status}</p>
                  </div>
                  <p className="text-gray-500 text-xs tabular-nums">{formatCatchTime(c.created_at)}</p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Link href="/new" className="flex-1">
              <button className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Fang hinzufügen
              </button>
            </Link>
            <button
              onClick={endSession}
              className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4" /> Beenden
            </button>
          </div>
        </div>
      )}

      {!activeSession && lastCatch && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800">
          <div className="px-4 pt-4 pb-2">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Letzter Fang</p>
          </div>

          {lastCatch.image_url && (
            <img
              src={lastCatch.image_url}
              alt={lastCatch.fish}
              className="w-full h-48 object-cover"
            />
          )}

          <div className="p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold text-lg">
                  {lastCatch.fish}
                  {lastCatch.sub_fish && (
                    <span className="text-gray-400 font-normal text-sm ml-2">{lastCatch.sub_fish}</span>
                  )}
                </p>
                <div className="flex items-center gap-3 text-gray-400 text-sm mt-0.5">
                  {lastCatch.length_cm ? (
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.length_cm} cm</span>
                  ) : null}
                  {lastCatch.weight_g ? (
                    <span className="flex items-center gap-1"><Scale className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.weight_g} g</span>
                  ) : null}
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full ${
                lastCatch.status === "Zurückgesetzt"
                  ? "bg-blue-500/15 text-blue-400"
                  : "bg-orange-500/15 text-orange-400"
              }`}>
                {lastCatch.status || "-"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400">
              {lastCatch.sessions?.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.sessions.location}</span>}
              {lastCatch.method && <span className="flex items-center gap-1"><Fish className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.method}</span>}
              {lastCatch.weather && <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.weather}</span>}
              {lastCatch.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" strokeWidth={1.75} /> {lastCatch.temperature}°C</span>}
            </div>

            <p className="text-gray-600 text-xs pt-1">{formatCatchDate(lastCatch.created_at)}</p>
          </div>
        </div>
      )}

    </div>
  );
}
