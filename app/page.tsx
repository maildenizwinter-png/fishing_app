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
      const end = s.end_time
        ? new Date(s.end_time).getTime()
        : Date.now();

      let diffMinutes = Math.floor((end - start) / (1000 * 60));

      if (diffMinutes > 0 && diffMinutes < 24 * 60) {
        totalMinutes += diffMinutes;
      }
    });

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    setTotalTime(`${h}h ${m}min`);

    const { data: catches } = await supabase.from("catches").select("*");

    if (catches) {
      const catchesThisYear = catches.filter((c: any) =>
        c.created_at?.slice(0, 4) === currentYear.toString()
      );
      setFishCount(catchesThisYear.length);
    }

    const storedId = localStorage.getItem("activeSessionId");

    if (storedId) {
      const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", storedId)
        .single();

      setActiveSession(data);

      const { data: catches } = await supabase
        .from("catches")
        .select("*")
        .eq("session_id", storedId)
        .order("created_at", { ascending: false });

      setSessionCatches(catches || []);
    } else {
      setActiveSession(null);
    }
  };

  const endSession = async () => {
    if (!activeSession) return;

    const confirmEnd = confirm("Session wirklich beenden?");
    if (!confirmEnd) return;

    await supabase
      .from("sessions")
      .update({ end_time: new Date().toISOString() })
      .eq("id", activeSession.id);

    localStorage.removeItem("activeSessionId");
    setActiveSession(null);
  };

  const formatSessionTime = (date: string) => {
    const utcDate = new Date(date + "Z");

    return utcDate.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  };

  const formatCatchTime = (date: string) => {
    if (!date) return "-";

    try {
      const iso = date.replace(" ", "T");
      const d = new Date(iso);

      if (isNaN(d.getTime())) return "-";

      return d.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch {
      return "-";
    }
  };

  const getDuration = (start: string) => {
    const diff = Date.now() - new Date(start).getTime();

    let totalMin = Math.floor(diff / (1000 * 60));
    totalMin = totalMin - 120;

    if (totalMin < 0) totalMin = 0;

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;

    return `${h}h ${m}min`;
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-6">

      {/* Navigation */}
      <div className="flex gap-2">
        <Link href="/" className="flex-1 bg-gray-200 p-2 text-center rounded">
          Dashboard
        </Link>

        <Link href="/sessions" className="flex-1 bg-gray-200 p-2 text-center rounded">
          Sessions
        </Link>

        <Link href="/catches" className="flex-1 bg-gray-200 p-2 text-center rounded">
          Fische
        </Link>
      </div>

      <h1 className="text-3xl font-bold">
        Mein Dashboard {currentYear}
      </h1>

      {/* Stats */}
      <div>
        <Link href="/catches" className="block mb-3">
          <div className="bg-blue-500 text-white p-4 rounded-xl flex justify-between cursor-pointer hover:opacity-90">
            <span>🐟 Fische</span>
            <span>{fishCount}</span>
          </div>
        </Link>

        <Link href="/sessions" className="block mb-3">
          <div className="bg-green-500 text-white p-4 rounded-xl flex justify-between cursor-pointer hover:opacity-90">
            <span>🎣 Sessions</span>
            <span>{sessionCount}</span>
          </div>
        </Link>

        <div className="bg-orange-500 text-white p-4 rounded-xl flex justify-between">
          <span>⏱️ Zeit am Wasser</span>
          <span>{totalTime}</span>
        </div>
      </div>

      {/* Session */}
      {!activeSession ? (
        <Link href="/session">
          <button className="bg-green-500 text-white p-3 w-full rounded-xl">
            ▶️ Neue Session starten
          </button>
        </Link>
      ) : (
        <div className="border p-4 rounded space-y-3 bg-green-100">

          <h2 className="font-bold">🔴 Laufende Session</h2>

          <p>🎣 <strong>{activeSession.location}</strong></p>
          <p>🕒 Start: {formatSessionTime(activeSession.start_time)}</p>
          <p>⏱️ Dauer: {getDuration(activeSession.start_time)}</p>

          <div className="space-y-2">
            <h3 className="font-bold">Fänge</h3>

            {sessionCatches.length === 0 && <p>Keine Fänge</p>}

            {sessionCatches.map((c: any) => (
              <div key={c.id} className="bg-white p-2 rounded border">
                <p><strong>{c.fish || "-"}</strong></p>
                <p>
                  {c.length_cm ? `${c.length_cm} cm` : "-"} • {c.status || "-"}
                </p>
                <p>{formatCatchTime(c.created_at)}</p>
              </div>
            ))}
          </div>

          <Link href="/new">
            <button className="bg-blue-500 text-white p-2 w-full rounded">
              ➕ Fang hinzufügen
            </button>
          </Link>

          <button
            onClick={endSession}
            className="bg-red-500 text-white p-2 w-full rounded"
          >
            ⏹️ Session beenden
          </button>
        </div>
      )}
    </main>
  );
}