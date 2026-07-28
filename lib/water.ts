// Wasserführung (river discharge) via Open-Meteo Flood-API (GloFAS-Modell).
// Liefert modellierte Abflussmenge in m³/s + Tendenz. Kein cm-Pegel — für die
// Argen gibt es keinen frei/zuverlässig abrufbaren cm-Pegel (HVZ ohne API,
// PEGELONLINE/PEGELALARM decken die Argen nicht ab).

export type WaterTrend = "steigend" | "fallend" | "gleich";

export type WaterInfo = {
  current: number | null; // aktueller Abfluss m³/s
  trend: WaterTrend | null;
  changePct: number | null;
  series: { date: string; value: number }[]; // ~7 Tage
};

export async function fetchWaterInfo(lat: number, lon: number): Promise<WaterInfo> {
  const empty: WaterInfo = { current: null, trend: null, changePct: null, series: [] };
  try {
    const url =
      `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}` +
      `&daily=river_discharge&past_days=7&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return empty;
    const data = await res.json();
    const times: string[] = data?.daily?.time || [];
    const vals: (number | null)[] = data?.daily?.river_discharge || [];
    const series = times
      .map((t, i) => ({ date: t, value: vals[i] }))
      .filter((p) => p.value != null) as { date: string; value: number }[];
    if (series.length === 0) return empty;

    const current = series[series.length - 1].value;
    const prev = series.length >= 4 ? series[series.length - 4].value : series[0].value;
    const diff = current - prev;
    const changePct = prev ? (diff / prev) * 100 : null;

    let trend: WaterTrend = "gleich";
    if (changePct != null) {
      if (changePct > 5) trend = "steigend";
      else if (changePct < -5) trend = "fallend";
    }
    return { current, trend, changePct, series };
  } catch {
    return empty;
  }
}

export type WaterSearchResult = { name: string; shortName: string; lat: number; lon: number };

// Gewässersuche über OpenStreetMap / Nominatim (Name -> Koordinaten).
export async function searchWaters(query: string): Promise<WaterSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
      `&format=json&limit=6&accept-language=de`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((r: any) => ({
      name: r.display_name as string,
      shortName: (r.display_name as string).split(",")[0],
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));
  } catch {
    return [];
  }
}

export function formatDischarge(v: number | null): string {
  if (v == null) return "–";
  return v >= 10 ? `${Math.round(v)} m³/s` : `${v.toFixed(2)} m³/s`;
}
