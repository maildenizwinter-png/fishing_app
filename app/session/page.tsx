"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Waves, Play, CalendarPlus, MapPin, Cloud, RefreshCw, Fish, Save } from "lucide-react";
import { fetchWaterInfo } from "../../lib/water";
import { fetchHvzByCoords } from "../../lib/hvz";
import { loadSavedPegels, recallPegel, rememberPegel, SavedPegel } from "../../lib/pegel";

export default function SessionPage() {
  const [location, setLocation] = useState("");
  const [companion, setCompanion] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"now" | "manual">("now");

  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  const [pegels, setPegels] = useState<SavedPegel[]>([]);
  const [selectedPegelId, setSelectedPegelId] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    loadSavedPegels().then((ps) => {
      setPegels(ps);
      setSelectedPegelId((cur) => {
        if (cur != null) return cur;
        const remembered = recallPegel();
        if (remembered != null && ps.some((p) => p.id === remembered)) return remembered;
        return ps[0]?.id ?? null;
      });
    });
  }, []);

  // Beim Wechsel des Gewässers den dafür gemerkten Pegel vorauswählen
  useEffect(() => {
    if (!location.trim() || pegels.length === 0) return;
    const remembered = recallPegel(location);
    if (remembered != null && pegels.some((p) => p.id === remembered)) {
      setSelectedPegelId(remembered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, pegels]);

  const getEnvironmentData = async (pegel: SavedPegel | null) => {
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
            // Wasserführung vom gewählten HVZ-Pegel; ohne Pegel Fallback aufs Modell
            let discharge: number | null = null;
            if (pegel) {
              const d = await fetchHvzByCoords(pegel.latitude, pegel.longitude);
              discharge = d?.q ?? null;
            } else {
              const water = await fetchWaterInfo(lat, lon);
              discharge = water.current;
            }
            resolve({
              latitude: lat,
              longitude: lon,
              temperature: weatherData.main?.temp,
              pressure: weatherData.main?.pressure,
              weather: weatherData.weather?.[0]?.main,
              river_discharge: discharge,
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

    const chosenPegel = pegels.find((p) => p.id === selectedPegelId) || null;
    if (chosenPegel) rememberPegel(location, chosenPegel.id);

    const { data: { user } } = await supabase.auth.getUser();
    const env = mode === "now" ? await getEnvironmentData(chosenPegel) : {};

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

      // Ersten Messpunkt sofort loggen. Wichtig: session_logs hat KEINE
      // river_discharge-Spalte → vor dem Insert entfernen. Das laufende
      // Nachtrag-Tracking übernimmt danach der globale SessionTracker.
      const { river_discharge, ...logEnv } = env as any;
      if (logEnv.latitude != null) {
        await supabase.from("session_logs").insert([{
          session_id: data.id,
          created_at: new Date().toISOString(),
          ...logEnv,
        }]);
        localStorage.setItem("lastTrackLog", String(Date.now()));
      }
    }

    setLoading(false);
    router.push("/");
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

      {mode === "now" && pegels.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-gray-500 text-xs px-1">Pegel für die Wasserführung</label>
          <select
            value={selectedPegelId ?? ""}
            onChange={(e) => setSelectedPegelId(e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
          >
            <option value="">— kein Pegel —</option>
            {pegels.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {mode === "now" && pegels.length === 0 && (
        <p className="text-gray-500 text-xs px-1">
          Tipp: Lege unter <span className="text-gray-400">Stats → Pegel</span> deine HVZ-Pegel an, dann kannst du hier den passenden Pegel wählen.
        </p>
      )}

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
          <p className="flex items-center gap-2"><Waves className="w-4 h-4 text-gray-500" strokeWidth={1.75} /> Wasserführung vom gewählten Pegel</p>
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
