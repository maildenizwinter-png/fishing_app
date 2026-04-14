"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editCompanion, setEditCompanion] = useState("");

  const loadSessions = async () => {
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .order("start_time", { ascending: false });

    setSessions(data || []);
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatTime = (date: string) => {
    const utcDate = new Date(date + "Z");

    return utcDate.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
  };

  const formatDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();

    let diffMin = Math.floor((endTime - startTime) / (1000 * 60));
    diffMin = diffMin - 120;
    if (diffMin < 0) diffMin = 0;

    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;

    return `${h}h ${m}min`;
  };

  // ✏️ Edit starten
  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditLocation(s.location || "");
    setEditCompanion(s.companion || "");
  };

  // 💾 Speichern
  const saveEdit = async (id: number) => {
    await supabase
      .from("sessions")
      .update({
        location: editLocation,
        companion: editCompanion,
      })
      .eq("id", id);

    setEditingId(null);
    loadSessions();
  };

  // 🗑️ Löschen
  const deleteSession = async (id: number) => {
    const confirmDelete = confirm("Session wirklich löschen?");
    if (!confirmDelete) return;

    await supabase.from("sessions").delete().eq("id", id);
    loadSessions();
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">📋 Angelzeiten</h1>

      {sessions.map((s) => (
        <div key={s.id} className="border p-4 rounded space-y-2">

          {editingId === s.id ? (
            <>
              {/* 🟢 EDIT MODUS */}
              <select
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full border p-2"
              >
                <option>Obere Argen</option>
                <option>Doppelargen</option>
                <option>Weiher Neuravensburg</option>
              </select>

              <input
                value={editCompanion}
                onChange={(e) => setEditCompanion(e.target.value)}
                className="w-full border p-2"
                placeholder="Begleiter"
              />

              <button
                onClick={() => saveEdit(s.id)}
                className="bg-green-500 text-white p-2 w-full rounded"
              >
                💾 Speichern
              </button>
            </>
          ) : (
            <>
              {/* 🔵 NORMAL MODUS */}
              <p>🎣 <strong>{s.location}</strong></p>
              <p>👤 {s.companion || "-"}</p>
              <p>🌦️ {s.weather || "-"}</p>
              <p>🌡️ {s.temperature ?? "-"} °C</p>

              <p>🕒 Start: {formatTime(s.start_time)}</p>

              {s.end_time && (
                <p>🛑 Ende: {formatTime(s.end_time)}</p>
              )}

              <p>⏱️ Dauer: {formatDuration(s.start_time, s.end_time)}</p>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => startEdit(s)}
                  className="bg-yellow-400 px-2 py-1 rounded"
                >
                  ✏️ Bearbeiten
                </button>

                <button
                  onClick={() => deleteSession(s.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  🗑️ Löschen
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </main>
  );
}