"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editCompanion, setEditCompanion] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  const loadSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from("sessions")
      .select("*, catches(count)")
      .eq("user_id", user?.id)
      .order("start_time", { ascending: false });
    setSessions(data || []);
  };

  useEffect(() => {
    loadSessions();
  }, []);

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

  const toLocalDatetimeString = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "Z");
    if (isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const startEdit = (s: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditLocation(s.location || "");
    setEditCompanion(s.companion || "");
    setEditStartTime(toLocalDatetimeString(s.start_time));
    setEditEndTime(s.end_time ? toLocalDatetimeString(s.end_time) : "");
  };

  const saveEdit = async (id: number) => {
    await supabase.from("sessions")
      .update({
        location: editLocation,
        companion: editCompanion,
        start_time: editStartTime ? new Date(editStartTime).toISOString() : undefined,
        end_time: editEndTime ? new Date(editEndTime).toISOString() : null,
      })
      .eq("id", id);
    setEditingId(null);
    loadSessions();
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Session löschen?\n\n⚠️ Alle Fänge und Wetterdaten werden mit gelöscht!\n\nWirklich alles löschen?")) return;
    await supabase.from("sessions").delete().eq("id", id);
    loadSessions();
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">🎣 Angelzeiten</h1>
        <p className="text-gray-400 text-sm">{sessions.length} Sessions gesamt</p>
      </div>

      {sessions.map((s) => (
        <div key={s.id} className="bg-gray-800 rounded-2xl p-4 space-y-3">

          {editingId === s.id ? (
            <>
              {/* Gewässer */}
              <div className="space-y-1">
                <p className="text-gray-400 text-xs">📍 Gewässer</p>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2"
                >
                  <option>Obere Argen</option>
                  <option>Doppelargen</option>
                  <option>Weiher Neuravensburg</option>
                </select>
              </div>

              {/* Begleiter */}
              <div className="space-y-1">
                <p className="text-gray-400 text-xs">👤 Begleiter</p>
                <input
                  value={editCompanion}
                  onChange={(e) => setEditCompanion(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2"
                  placeholder="Begleiter (optional)"
                />
              </div>

              {/* Startzeit */}
              <div className="space-y-1">
                <p className="text-gray-400 text-xs">🕒 Startzeit</p>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2"
                />
              </div>

              {/* Endzeit */}
              <div className="space-y-1">
                <p className="text-gray-400 text-xs">🛑 Endzeit (optional)</p>
                <input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full bg-gray-700 text-white border border-gray-600 rounded-xl p-2"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(s.id)}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl transition"
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-xl transition"
                >
                  Abbrechen
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href={`/sessions/${s.id}`}>
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold text-lg">{s.location || "-"}</p>
                      <p className="text-gray-400 text-sm">👤 {s.companion || "Alleine"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">⏱️ {formatDuration(s.start_time, s.end_time)}</p>
                      {s.catches?.[0]?.count > 0 && (
                        <p className="text-blue-400 text-xs">🐟 {s.catches[0].count} Fang/Fänge</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs text-gray-400">
                    <span>🕒 {formatTime(s.start_time)}</span>
                    {s.end_time && <span>🛑 {formatTime(s.end_time)}</span>}
                  </div>

                  <div className="flex gap-3 text-sm text-gray-400">
                    {s.weather && <span>🌦️ {s.weather}</span>}
                    {s.temperature && <span>🌡️ {s.temperature}°C</span>}
                  </div>
                </div>
              </Link>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => startEdit(s, e)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl text-sm transition"
                >
                  ✏️ Bearbeiten
                </button>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 py-2 rounded-xl text-sm transition"
                >
                  🗑️ Löschen
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}