"use client";
import { useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Waves, Play, CalendarPlus, MapPin, Cloud, RefreshCw, Fish, Save } from "lucide-react";
import { fetchWaterInfo } from "../../lib/water";
import { queueSession } from "../../lib/offlineDb";

export default function SessionPage() {
  const [location, setLocation] = useState("");
  const [companion, setCompanion] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"now" | "manual">("now");

  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const getEnvironmentData = async () => {
    return new Promise<any>((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const base: any = { latitude: lat, longitude: lon };
          // GPS bleibt auch offline erhalten; Wetter/Wasser nur mit Verbindung
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            resolve(base);
            return;
          }
          try {
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
            );
            const weatherData = await res.json();
            base.temperature = weatherData.main?.temp;
            base.pressure = weatherData.main?.pressure;
            base.weather = weatherData.weather?.[0]?.main;
          } catch {}
          try {
            const water = await fetchWaterInfo(lat, lon);
            base.river_discharge = water.current;
          } catch {}
          resolve(base);
        },
        () => resolve({})
      );
    });
  };

  const startSession = async () => {
    if (!location) {
      alert("Bitte ein Gewässer wählen!");
      return;
    }

    if (mode === "manual" && !manualStart) {
      alert("Bitte Startzeit angeben!");
      return;
    }

    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    const env = mode === "now" ? await getEnvironmentData() : {};

    const startTime = mode === "manual"
      ? new Date(manualStart).toISOString()
      : new Date().toISOString();

    const endTime = mode === "manual" && manualEnd
      ? new Date(manualEnd).toISOString()
      : null;

    const payload: any = {
      start_time: startTime,
      end_time: endTime,
      location,
      companion,
      user_id: userId,
      ...env,
    };

    const online = typeof navigator !== "undefined" ? navigator.onLine : true;

    const queueOffline = async () => {
      const outboxId = await queueSession(payload);
      if (mode === "now") {
        // negativer Marker = lokale (noch nicht synchronisierte) Session
        localStorage.setItem("activeSessionId", String(-outboxId));
      }
      window.dispatchEvent(new Event("outbox-changed"));
      setLoading(false);
      router.push("/");
    };

    if (!online) {
      await queueOffline();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("sessions")
        .insert([payload])
        .select()
        .single();
      if (error) throw error;

      if (mode === "now") {
        setSessionId(data.id);
        localStorage.setItem("activeSessionId", data.id.toString());

        intervalRef.current = setInterval(async () => {
          const env = await getEnvironmentData();
          if (typeof navigator !== "undefined" && navigator.onLine) {
            await supabase.from("session_logs").insert([{
              session_id: data.id,
              created_at: new Date().toISOString(),
              ...env,
            }]);
          }
        }, 30000);
      }

      setLoading(false);
      router.push("/");
    } catch {
      await queueOffline();
    }
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-4 py-3.5 text-[15px] placeholder-gray-500 focus:border-teal-500 focus:outline-none transition";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">

      <div className="pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <Waves className="w-5 h-5 text-teal-400" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Neue Session</h1>
          <p className="text-gray-400 text-sm">Angelzeit erfassen</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("now")}
          className={`py-3.5 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            mode === "now" ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          <Play className="w-4 h-4" /> Jetzt starten
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`py-3.5 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
            mode === "manual" ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 border border-gray-700"
          }`}
        >
          <CalendarPlus className="w-4 h-4" /> Nachtragen
        </button>
      </div>

      <input
        list="gewässer-list"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Gewässer wählen oder eingeben"
        className={inputClass}
      />
      <datalist id="gewässer-list">
        <option value="Obere Argen" />
        <option value="Doppelargen" />
        <option value="Weiher Neuravensburg" />
      </datalist>

      <input
        value={companion}
        placeholder="Begleiter (optional)"
        onChange={(e) => setCompanion(e.target.value)}
        className={inputClass}
      />

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs px-1">Startzeit</label>
            <input
              type="datetime-local"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-gray-500 text-xs px-1">Endzeit · optional</label>
            <input
              type="datetime-local"
              value={manualEnd}
              onChange={(e) => setManualEnd(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {mode === "now" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2.5 text-sm text-gray-400">
          <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> GPS wird automatisch erfasst</p>
          <p className="flex items-center gap-2"><Cloud className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Wetter wird automatisch geladen</p>
          <p className="flex items-center gap-2"><Waves className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Wasserführung wird erfasst</p>
          <p className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Tracking alle 30 Sekunden</p>
        </div>
      )}

      {mode === "manual" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2.5 text-sm text-gray-400">
          <p className="flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Session wird nachträglich erfasst</p>
          <p className="flex items-center gap-2"><Fish className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Fänge kannst du danach eintragen</p>
          <p className="flex items-center gap-2"><Cloud className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Kein automatisches Wetter-Tracking</p>
        </div>
      )}

      <button
        onClick={startSession}
        disabled={loading}
        className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-4 rounded-2xl text-lg transition flex items-center justify-center gap-2"
      >
        {mode === "now" ? <Play className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {loading ? "Wird gespeichert…" : mode === "now" ? "Session starten" : "Session speichern"}
      </button>

    </div>
  );
}
