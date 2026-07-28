// Beißvorhersage ("Beiß-Index") — transparente Heuristik, KEINE Garantie.
// Kombiniert Luftdruck-Trend, Mondphase, Bewölkung, Niederschlag und
// Wasserführungs-Trend zu einem Score je Tag + beste Zeiten (Dämmerung).
// Datenquelle: Open-Meteo Forecast (kostenlos, kein Key) + Open-Meteo Flood.

import { fetchWaterInfo } from "./water";

export type BiteRating = "top" | "gut" | "ok" | "mäßig" | "schlecht";
export type BiteFactor = { label: string; value: string; score: number };
export type BiteDay = {
  date: string;
  weekday: string;
  score: number;
  rating: BiteRating;
  factors: BiteFactor[];
  moonEmoji: string;
  bestWindows: string[];
};

function ratingFromScore(s: number): BiteRating {
  if (s >= 75) return "top";
  if (s >= 62) return "gut";
  if (s >= 50) return "ok";
  if (s >= 38) return "mäßig";
  return "schlecht";
}

// Mondphase (Näherung ab bekanntem Neumond 2000-01-06 18:14 UTC)
function moon(date: Date) {
  const synodic = 29.530588853;
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const now = date.getTime() / 86400000;
  let phase = ((now - ref) / synodic) % 1;
  if (phase < 0) phase += 1; // 0 = Neumond, 0.5 = Vollmond
  const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  const emojis = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const emoji = emojis[Math.round(phase * 8) % 8];
  // Neu-/Vollmond = aktiver (Solunar) → hoher Score, Halbmond niedriger
  const score = 40 + 60 * (Math.abs(illum - 0.5) / 0.5);
  const name =
    illum < 0.06 ? "Neumond" : illum > 0.94 ? "Vollmond" : phase < 0.5 ? "zunehmend" : "abnehmend";
  return { illum, emoji, score, name };
}

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const windowAround = (iso: string, minStart: number, minEnd: number) => {
  const base = new Date(iso);
  return `${hhmm(new Date(base.getTime() + minStart * 60000))}–${hhmm(new Date(base.getTime() + minEnd * 60000))}`;
};

export async function fetchBitePrediction(lat: number, lon: number): Promise<BiteDay[]> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=surface_pressure,cloud_cover,precipitation&daily=sunrise,sunset` +
      `&timezone=auto&forecast_days=3`;
    const [res, water] = await Promise.all([fetch(url), fetchWaterInfo(lat, lon)]);
    if (!res.ok) return [];
    const d = await res.json();

    const ht: string[] = d.hourly?.time || [];
    const hp: number[] = d.hourly?.surface_pressure || [];
    const hc: number[] = d.hourly?.cloud_cover || [];
    const hr: number[] = d.hourly?.precipitation || [];
    const dt: string[] = d.daily?.time || [];
    const sr: string[] = d.daily?.sunrise || [];
    const ss: string[] = d.daily?.sunset || [];

    const days: BiteDay[] = [];
    for (let i = 0; i < dt.length; i++) {
      const date = dt[i];
      const idxs = ht.map((t, j) => (t.startsWith(date) ? j : -1)).filter((j) => j >= 0);
      if (idxs.length === 0) continue;

      const press = idxs.map((j) => hp[j]).filter((v) => v != null);
      const clouds = idxs.map((j) => hc[j]).filter((v) => v != null);
      const rain = idxs.map((j) => hr[j]).filter((v) => v != null);

      const dp = press.length > 1 ? press[press.length - 1] - press[0] : 0;
      const cloudMean = clouds.length ? clouds.reduce((a, b) => a + b, 0) / clouds.length : 50;
      const rainSum = rain.reduce((a, b) => a + b, 0);

      let pScore = 62;
      if (dp <= -3) pScore = 90;
      else if (dp <= -1) pScore = 78;
      else if (dp < 1) pScore = 62;
      else if (dp < 3) pScore = 45;
      else pScore = 30;

      let cScore = 55;
      if (cloudMean >= 60 && cloudMean <= 95) cScore = 75;
      else if (cloudMean >= 30) cScore = 65;
      else if (cloudMean > 95) cScore = 70;
      else cScore = 50;

      let rScore = 60;
      if (rainSum > 0 && rainSum <= 3) rScore = 72;
      else if (rainSum <= 10) rScore = 55;
      else if (rainSum > 10) rScore = 40;

      const m = moon(new Date(date + "T12:00:00"));

      let wScore = 60;
      if (water.trend === "steigend") wScore = 70;
      else if (water.trend === "fallend") wScore = 62;

      const score = Math.round(
        pScore * 0.35 + m.score * 0.25 + cScore * 0.2 + rScore * 0.1 + wScore * 0.1
      );

      const factors: BiteFactor[] = [
        { label: "Luftdruck", value: dp <= -1 ? "fallend" : dp >= 1 ? "steigend" : "stabil", score: pScore },
        { label: "Mond", value: `${m.emoji} ${m.name}`, score: m.score },
        { label: "Bewölkung", value: `${Math.round(cloudMean)} %`, score: cScore },
        { label: "Niederschlag", value: rainSum < 0.1 ? "keiner" : `${rainSum.toFixed(1)} mm`, score: rScore },
      ];
      if (water.trend) factors.push({ label: "Wasser", value: water.trend, score: wScore });

      const bestWindows: string[] = [];
      if (sr[i]) bestWindows.push(windowAround(sr[i], -45, 60));
      if (ss[i]) bestWindows.push(windowAround(ss[i], -60, 45));

      const weekday = new Date(date + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short" });
      days.push({ date, weekday, score, rating: ratingFromScore(score), factors, moonEmoji: m.emoji, bestWindows });
    }
    return days;
  } catch {
    return [];
  }
}
