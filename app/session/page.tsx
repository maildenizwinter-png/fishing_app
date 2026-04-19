"use client";
import { useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

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
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
            );
            const weatherData = await res.json();
            resolve({
              latitude: lat,
              longitude: lon,
              temperature: weatherData.main?.temp,
              pressure: weatherData.main?.pressure,
              weather: weatherData.weather?.[0]?.main,
            });
          } catch {
            resolve({});
          }
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

    const { data: { user } } = await supabase.auth.getUser();
    const env = mode === "now" ? await getEnvironmentData() : {};

    const startTime = mode === "manual"
      ? new Date(manualStart).toISOString()
      : new Date().toISOString();

    const endTime = mode === "manual" && manualEnd
      ? new Date(manualEnd).toISOString()
      : null;

    const { data, error } = await supabase
      .from("sessions")
      .insert([{
        start_time: startTime,
        end_time: endTime,
        location,
        companion,
        user_id: user?.id,
        ...env,
      }])
      .select()
      .single();

    if (error) {
      alert("Fehler beim Start: " + error.message);
      setLoading(false);
      return;
    }

    if (mode === "now") {
      setSessionId(data.id);
      localStorage.setItem("activeSessionId", data.id.toString());

      intervalRef.current = setInterval(async () => {
        const env = await getEnvironmentData();
        await supabase.from("session_logs").insert([{
          session_id: data.id,
          created_at: new Date().toISOString(),
          ...env,
        }]);
      }, 30000);
    }

    setLoading(false);
    router.push("/");
  };

  const inputClass = "w-full bg-gray-800 text-white border border-gray-700 rounded-xl p-3 placeholder-gray-600";
  const labelClass = "text-gray-400 text-sm";

  return (
    <div className="p-4 max-w-xl mx-auto space-y-6">

      <div className="pt-4">
        <h1 className="text-2xl font-bold text-white">🎣 Neue Session</h1>
        <p className="text-gray-400 text-sm">Angelzeit erfassen</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode("now")}
          className={`py-3 rounded-xl font-semibold transition ${
            mode === "now" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          ▶️ Jetzt starten
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`py-3 rounded-xl font-semibold transition ${
            mode === "manual" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
          }`}
        >
          📅 Nachtragen
        </button>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Gewässer</label>
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
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Begleiter (optional)</label>
        <input
          value={companion}
          placeholder="z.B. R2-D2 & C-3PO"
          onChange={(e) => setCompanion(e.target.value)}
          className={inputClass}
        />
      </div>

      {mode === "manual" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className={labelClass}>Startzeit</label>
            <input
              type="datetime-local"
              value={manualStart}
              onChange={(e) => setManualStart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Endzeit (optional)</label>
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
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2 text-sm text-gray-400">
          <p>📍 GPS wird automatisch erfasst</p>
          <p>🌦️ Wetter wird automatisch geladen</p>
          <p>🔁 Tracking alle 30 Sekunden</p>
        </div>
      )}

      {mode === "manual" && (
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2 text-sm text-gray-400">
          <p>📅 Session wird nachträglich erfasst</p>
          <p>🐟 Fänge kannst du danach eintragen</p>
          <p>🌦️ Kein automatisches Wetter-Tracking</p>
        </div>
      )}

      <button
        onClick={startSession}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition"
      >
        {loading ? "⏳ Wird gespeichert..." : mode === "now" ? "▶️ Session starten" : "💾 Session speichern"}
      </button>

    </div>
  );
}