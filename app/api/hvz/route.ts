// HVZ Baden-Württemberg – echte Pegel-Werte (Wasserstand W in cm, Abfluss Q in m³/s).
// Quelle: statische Datendateien der Hochwasservorhersagezentrale (LUBW).
// Serverseitig geholt (kein CORS) + gecacht. Es gibt bei HVZ KEINE numerische
// Zeitreihe als Daten – die Verlaufsgrafik ist nur ein GIF (siehe /api/hvz/graph).

const STMN_URL = "https://www.hvz.baden-wuerttemberg.de/js/hvz_peg_stmn.js";
const TMV_URL = "https://www.hvz.baden-wuerttemberg.de/js/dat-peg-tmv.js";
const UA = { headers: { "User-Agent": "Mozilla/5.0" } };

// Spalten in HVZ_Site.PEG_DB (siehe hvz_peg_var.js)
const POS = { DASA: 0, NAME: 1, GEW: 2, W: 4, WD: 5, WZ: 6, Q: 7, QD: 8, QZ: 9, LON: 20, LAT: 21 };

// Ein flaches [ 'a', 1, 'b', ... ] in Felder zerlegen (respektiert einfache Quotes).
function parseFields(inner: string): string[] {
  const f: string[] = [];
  let i = 0;
  const s = inner;
  while (i < s.length) {
    while (i < s.length && (s[i] === "," || s[i] === " " || s[i] === "\t" || s[i] === "\n" || s[i] === "\r")) i++;
    if (i >= s.length) break;
    if (s[i] === "'") {
      let j = i + 1;
      let val = "";
      while (j < s.length && s[j] !== "'") { val += s[j]; j++; }
      f.push(val);
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && s[j] !== ",") j++;
      f.push(s.slice(i, j).trim());
      i = j;
    }
  }
  return f;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const t = v.replace(",", ".").trim();
  if (t === "" || t === "--") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

async function loadRows(): Promise<string[][]> {
  const res = await fetch(STMN_URL, { ...UA, next: { revalidate: 600 } });
  if (!res.ok) throw new Error("stmn " + res.status);
  const text = await res.text();
  const start = text.indexOf("PEG_DB");
  const body = start >= 0 ? text.slice(start) : text;
  return [...body.matchAll(/\[([^\[\]]+)\]/g)].map((m) => parseFields(m[1]));
}

async function loadTmv(): Promise<Record<string, string[]>> {
  const res = await fetch(TMV_URL, { ...UA, next: { revalidate: 600 } });
  if (!res.ok) return {};
  const text = await res.text();
  const map: Record<string, string[]> = {};
  for (const m of text.matchAll(/(\d+):\[([^\]]+)\]/g)) map[m[1]] = parseFields(m[2]);
  return map;
}

function detailFor(r: string[], tmv: Record<string, string[]>) {
  const dasa = r[POS.DASA];
  const key = String(parseInt(dasa, 10)); // '00077' -> '77'
  const tm = tmv[key];
  return {
    dasa,
    name: r[POS.NAME],
    gew: r[POS.GEW],
    w: num(r[POS.W]),
    wUnit: r[POS.WD] || "cm",
    wTime: r[POS.WZ] || null,
    q: num(r[POS.Q]),
    qUnit: r[POS.QD] || "m³/s",
    qTime: r[POS.QZ] || null,
    lat: num(r[POS.LAT]),
    lon: num(r[POS.LON]),
    tmW: tm ? num(tm[1]) : null,
    tmQ: tm ? num(tm[4]) : null,
    tmDate: tm ? tm[3] || tm[6] || null : null,
  };
}

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = (aLat - bLat) * 111;
  const dLon = (aLon - bLon) * 111 * Math.cos((aLat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search");
  const id = url.searchParams.get("id");
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  try {
    const rows = await loadRows();

    // Suche: Pegel nach Name/Gewässer filtern (für die Auswahl-Liste)
    if (search != null) {
      const q = search.trim().toLowerCase();
      const hits = rows
        .filter((r) => q === "" || (r[POS.NAME] + " " + r[POS.GEW]).toLowerCase().includes(q))
        .filter((r) => r[POS.LAT] && r[POS.LON])
        .slice(0, 20)
        .map((r) => ({
          dasa: r[POS.DASA],
          name: r[POS.NAME],
          gew: r[POS.GEW],
          lat: num(r[POS.LAT]),
          lon: num(r[POS.LON]),
        }));
      return Response.json({ results: hits });
    }

    const tmv = await loadTmv();

    // Direkter Pegel per HVZ-ID
    if (id != null) {
      const r = rows.find((x) => x[POS.DASA] === id || String(parseInt(x[POS.DASA], 10)) === String(parseInt(id, 10)));
      if (!r) return Response.json({ gauge: null });
      return Response.json({ gauge: detailFor(r, tmv) });
    }

    // Nächstgelegener Pegel zu Koordinaten (für gespeicherte Gewässer)
    if (lat != null && lon != null) {
      const la = parseFloat(lat);
      const lo = parseFloat(lon);
      let best: string[] | null = null;
      let bestD = Infinity;
      for (const r of rows) {
        const rla = num(r[POS.LAT]);
        const rlo = num(r[POS.LON]);
        if (rla == null || rlo == null) continue;
        const d = distKm(la, lo, rla, rlo);
        if (d < bestD) { bestD = d; best = r; }
      }
      if (!best || bestD > 5) return Response.json({ gauge: null, distanceKm: best ? bestD : null });
      return Response.json({ gauge: detailFor(best, tmv), distanceKm: bestD });
    }

    return Response.json({ error: "missing query" }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
