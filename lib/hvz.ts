// Client-Helfer für die echten HVZ-Pegelwerte (über /api/hvz, serverseitig geholt).

export type HvzGauge = {
  dasa: string;
  name: string;
  gew: string;
  lat: number | null;
  lon: number | null;
};

export type HvzDetail = {
  dasa: string;
  name: string;
  gew: string;
  w: number | null;
  wUnit: string;
  wTime: string | null;
  q: number | null;
  qUnit: string;
  qTime: string | null;
  lat: number | null;
  lon: number | null;
  tmW: number | null;
  tmQ: number | null;
  tmDate: string | null;
};

export async function searchHvzGauges(query: string): Promise<HvzGauge[]> {
  try {
    const res = await fetch(`/api/hvz?search=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

// Nächstgelegener HVZ-Pegel zu Koordinaten (für gespeicherte Gewässer).
export async function fetchHvzByCoords(lat: number, lon: number): Promise<HvzDetail | null> {
  try {
    const res = await fetch(`/api/hvz?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.gauge || null;
  } catch {
    return null;
  }
}

export function hvzPegelUrl(dasa: string): string {
  return `https://www.hvz.baden-wuerttemberg.de/pegel.html?id=${dasa}`;
}

// Trend aus aktuellem Q gegenüber dem Tagesmittel des Vortags.
export function hvzTrend(cur: number | null, prev: number | null): { trend: "steigend" | "fallend" | "gleich"; changePct: number | null } {
  if (cur == null || prev == null || prev === 0) return { trend: "gleich", changePct: null };
  const changePct = ((cur - prev) / prev) * 100;
  let trend: "steigend" | "fallend" | "gleich" = "gleich";
  if (changePct > 5) trend = "steigend";
  else if (changePct < -5) trend = "fallend";
  return { trend, changePct };
}
