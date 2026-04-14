"use client";
import { useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SessionPage() {
  const [location, setLocation] = useState("");
  const [companion, setCompanion] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // 🌦️ + 📍 Daten holen
  const getEnvironmentData = async () => {
    return new Promise<any>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const weatherRes = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=af76d967f85380285cd5ea5d683a75a0&units=metric`
          );

          const weatherData = await weatherRes.json();

          resolve({
            latitude: lat,
            longitude: lon,
            temperature: weatherData.main?.temp,
            pressure: weatherData.main?.pressure,
            weather: weatherData.weather?.[0]?.main,
          });
        },
        () => {
          // 👉 Fallback wenn Standort nicht erlaubt
          resolve({});
        }
      );
    });
  };

  const startSession = async () => {
    const env = await getEnvironmentData();

    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          // ✅ RICHTIG: UTC speichern
          start_time: new Date().toISOString(),
          end_time: null,
          location,
          companion,
          ...env,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("Fehler beim Start: " + error.message);
      return;
    }

    setSessionId(data.id);

    // ✅ aktive Session speichern
    localStorage.setItem("activeSessionId", data.id.toString());

    // 🔁 AUTO TRACKING
    intervalRef.current = setInterval(async () => {
      const env = await getEnvironmentData();

      await supabase.from("session_logs").insert([
        {
          session_id: data.id,
          created_at: new Date().toISOString(),
          ...env,
        },
      ]);

      console.log("Auto-Log gespeichert");
    }, 30000);

    // ✅ DIREKT ZUR STARTSEITE
    router.push("/");
  };

  const endSession = async () => {
    if (!sessionId) {
      alert("Keine aktive Session!");
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const { error } = await supabase
      .from("sessions")
      .update({
        end_time: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      alert("Fehler beim Beenden: " + error.message);
    } else {
      alert("Angelzeit beendet ✅");
      setSessionId(null);
      localStorage.removeItem("activeSessionId");

      // 👉 optional zurück zur Startseite
      router.push("/");
    }
  };

  return (
    <main className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">🎣 Angelzeit</h1>

      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-full border p-2"
      >
        <option value="">Gewässer wählen</option>
        <option>Obere Argen</option>
        <option>Doppelargen</option>
        <option>Weiher Neuravensburg</option>
      </select>

      <input
        value={companion}
        placeholder="Begleiter"
        onChange={(e) => setCompanion(e.target.value)}
        className="w-full border p-2"
      />

      {!sessionId ? (
        <button
          onClick={startSession}
          className="bg-green-500 text-white p-3 w-full rounded"
        >
          ▶️ Start
        </button>
      ) : (
        <button
          onClick={endSession}
          className="bg-red-500 text-white p-3 w-full rounded"
        >
          ⏹️ Stop
        </button>
      )}
    </main>
  );
}