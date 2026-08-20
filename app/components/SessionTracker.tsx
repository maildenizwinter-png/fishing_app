"use client";
import { useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// Nachtrag-Tracking (akkufreundlich): Solange eine Session aktiv ist, wird ein
// Messpunkt (GPS + Wetter) geloggt, wann immer die App in den Vordergrund kommt
// bzw. offen/sichtbar ist. Kein Wake-Lock, kein Dauerbetrieb im Hintergrund –
// iOS/Android frieren Web-Apps im Hintergrund ohnehin ein.

const MIN_GAP_MS = 90_000; // frühestens alle 90 s ein Punkt (Doppel-Logs vermeiden)
const POLL_MS = 120_000;   // solange die App sichtbar offen ist: alle 2 Min prüfen

async function getWeather(lat: number, lon: number) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&units=metric`
    );
    const w = await res.json();
    return {
      temperature: w.main?.temp ?? null,
      pressure: w.main?.pressure ?? null,
      weather: w.weather?.[0]?.main ?? null,
    };
  } catch {
    return { temperature: null, pressure: null, weather: null };
  }
}

async function logPoint() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") return;
  if (!navigator.onLine) return;

  const storedId = localStorage.getItem("activeSessionId");
  const sid = storedId ? Number(storedId) : null;
  if (!sid || sid <= 0) return; // keine aktive Online-Session

  const last = Number(localStorage.getItem("lastTrackLog") || 0);
  const now = Date.now();
  if (now - last < MIN_GAP_MS) return;
  // sofort sperren, damit parallele Events nicht doppelt loggen
  localStorage.setItem("lastTrackLog", String(now));

  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { timeout: 10000, maximumAge: 60000 }
    );
  });
  if (!pos) return;

  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  const weather = await getWeather(lat, lon);

  // WICHTIG: session_logs hat KEINE river_discharge-Spalte → nicht mitschicken!
  await supabase.from("session_logs").insert([{
    session_id: sid,
    created_at: new Date().toISOString(),
    latitude: lat,
    longitude: lon,
    ...weather,
  }]);
}

export default function SessionTracker() {
  useEffect(() => {
    logPoint(); // beim App-Start / Seiten-Load

    const onVisible = () => logPoint();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);

    // Solange die App sichtbar offen bleibt, regelmäßig nachtragen.
    // (Bei ausgeschaltetem/Hintergrund-Display pausiert der Timer ohnehin.)
    const timer = setInterval(() => logPoint(), POLL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      clearInterval(timer);
    };
  }, []);

  return null;
}
