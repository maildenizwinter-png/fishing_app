"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Link from "next/link";
import { pendingSessions, cacheSet, cacheGet } from "../../lib/offlineDb";
import { Waves, User, Clock, Fish, Cloud, Thermometer, Pencil, Trash2, Save, MapPin, Flag, CloudUpload } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editCompanion, setEditCompanion] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

  const loadSessions = async () => {
    try { setPending(await pendingSessions()); } catch {}
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("no user");
      const { data, error } = await supabase
        .from("sessions")
        .select("*, catches(count)")
        .eq("user_id", user.id)
        .order("start_time", { ascending: false });
      if (error) throw error;
      setSessions(data || []);
      cacheSet("sessions", data || []);
    } catch {
      // offline: zuletzt gespiegelte Sessions aus dem Cache
      const cached = await cacheGet<any[]>("sessions");
      if (cached) setSessions(cached);
    }
  };

  useEffect(() => {
    loadSessions();
    const onChange = () => loadSessions();
    window.addEventListener("outbox-changed", onChange);
    return () => window.removeEventListener("outbox-changed", onChange);
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
    if (!confirm("Session löschen?\n\nAlle Fänge und Wetterdaten werden mit gelöscht!\n\nWirklich alles löschen?")) return;
    await supabase.from("sessions").delete().eq("id", id);
    loadSessions();
  };

  const editInput = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:outline-none transition";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      <div className="pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <Waves className="w-5 h-5 text-teal-400" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Angelzeiten</h1>
          <p className="text-gray-400 text-sm">{sessions.length} Sessions gesamt</p>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <CloudUpload className="w-3.5 h-3.5" /> Offline gestartet – noch nicht synchronisiert
          </p>
          {pending.map((p) => {
            const pl = p.payload || {};
            return (
              <div key={`local-${p.id}`} className="bg-gray-900 border border-amber-600/40 rounded-2xl p-4 space-y-1.5">
                <p className="text-white font-semibold text-lg">{pl.location || "-"}</p>
                <p className="text-gray-400 text-sm flex items-center gap-1.5"><User className="w-3.5 h-3.5" strokeWidth={1.75} /> {pl.companion || "Alleine"}</p>
                <p className="text-amber-400 text-xs flex items-center gap-1.5"><CloudUpload className="w-3.5 h-3.5" /> wird bei Verbindung synchronisiert</p>
              </div>
            );
          })}
        </div>
      )}

      {sessions.map((s) => (
        <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">

          {editingId === s.id ? (
            <>
              <div className="space-y-1.5">
                <p className="text-gray-500 text-xs px-1">Gewässer</p>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className={editInput}
                >
                  <option>Obere Argen</option>
                  <option>Doppelargen</option>
                  <option>Weiher Neuravensburg</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <p className="text-gray-500 text-xs px-1">Begleiter</p>
                <input
                  value={editCompanion}
                  onChange={(e) => setEditCompanion(e.target.value)}
                  className={editInput}
                  placeholder="Begleiter (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-gray-500 text-xs px-1">Startzeit</p>
                <input
                  type="datetime-local"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className={editInput}
                />
              </div>

              <div className="space-y-1.5">
                <p className="text-gray-500 text-xs px-1">Endzeit · optional</p>
                <input
                  type="datetime-local"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className={editInput}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => saveEdit(s.id)}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white py-2 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Speichern
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl transition"
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
                      <p className="text-white font-semibold text-lg">{s.location || "-"}</p>
                      <p className="text-gray-400 text-sm flex items-center gap-1.5"><User className="w-3.5 h-3.5" strokeWidth={1.75} /> {s.companion || "Alleine"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> {formatDuration(s.start_time, s.end_time)}</p>
                      {s.catches?.[0]?.count > 0 && (
                        <p className="text-teal-400 text-xs flex items-center gap-1"><Fish className="w-3.5 h-3.5" strokeWidth={1.75} /> {s.catches[0].count} Fang/Fänge</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={1.75} /> {formatTime(s.start_time)}</span>
                    {s.end_time && <span className="flex items-center gap-1"><Flag className="w-3.5 h-3.5" strokeWidth={1.75} /> {formatTime(s.end_time)}</span>}
                  </div>

                  <div className="flex gap-4 text-sm text-gray-400">
                    {s.weather && <span className="flex items-center gap-1"><Cloud className="w-3.5 h-3.5" strokeWidth={1.75} /> {s.weather}</span>}
                    {s.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" strokeWidth={1.75} /> {s.temperature}°C</span>}
                  </div>
                </div>
              </Link>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => startEdit(s, e)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 py-2 rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Bearbeiten
                </button>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Löschen
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
