"use client";
import { useEffect, useState } from "react";
import { fetchBitePrediction, BiteDay, BiteRating } from "../../lib/bite";
import { fetchHvzByCoords, hvzTrend } from "../../lib/hvz";
import { loadSavedPegels, recallPegel, rememberPegel, SavedPegel } from "../../lib/pegel";
import { Fish, Sunrise } from "lucide-react";

const ratingStyle: Record<BiteRating, { label: string; cls: string }> = {
  top: { label: "Top", cls: "bg-emerald-500/15 text-emerald-400" },
  gut: { label: "Gut", cls: "bg-teal-500/15 text-teal-400" },
  ok: { label: "OK", cls: "bg-amber-500/15 text-amber-400" },
  "mäßig": { label: "Mäßig", cls: "bg-orange-500/15 text-orange-400" },
  schlecht: { label: "Schlecht", cls: "bg-gray-700 text-gray-400" },
};

export default function BitePrediction({ lat, lon }: { lat: number; lon: number }) {
  const [days, setDays] = useState<BiteDay[] | null>(null);
  const [pegels, setPegels] = useState<SavedPegel[]>([]);
  const [selectedPegelId, setSelectedPegelId] = useState<number | null>(null);

  useEffect(() => {
    loadSavedPegels().then((ps) => {
      setPegels(ps);
      const r = recallPegel();
      setSelectedPegelId(r != null && ps.some((p) => p.id === r) ? r : (ps[0]?.id ?? null));
    });
  }, []);

  useEffect(() => {
    let alive = true;
    setDays(null);
    (async () => {
      // Wasser-Trend vom gewählten HVZ-Pegel; ohne Pegel Fallback aufs Modell
      let opts: { waterTrend?: import("../../lib/water").WaterTrend | null } | undefined;
      const p = pegels.find((x) => x.id === selectedPegelId);
      if (p) {
        const d = await fetchHvzByCoords(p.latitude, p.longitude);
        opts = { waterTrend: d ? hvzTrend(d.q, d.tmQ).trend : null };
      }
      const res = await fetchBitePrediction(lat, lon, opts);
      if (alive) setDays(res);
    })();
    return () => { alive = false; };
  }, [lat, lon, selectedPegelId, pegels]);

  const fmtDate = (iso: string) => {
    const [, m, dd] = iso.split("-");
    return `${dd}.${m}.`;
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <Fish className="w-5 h-5 text-teal-400" strokeWidth={1.75} /> Beißvorhersage
        </h2>
        <span className="text-gray-600 text-xs">Einschätzung, keine Garantie</span>
      </div>

      {pegels.length > 0 && (
        <select
          value={selectedPegelId ?? ""}
          onChange={(e) => {
            const id = e.target.value ? Number(e.target.value) : null;
            setSelectedPegelId(id);
            if (id != null) rememberPegel(undefined, id);
          }}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-xl px-3 py-2 text-xs focus:border-teal-500 focus:outline-none transition"
        >
          <option value="">Wasser-Trend: Modell (Open-Meteo)</option>
          {pegels.map((p) => (
            <option key={p.id} value={p.id}>Wasser-Trend: {p.name}</option>
          ))}
        </select>
      )}

      {days === null ? (
        <p className="text-gray-500 text-sm">Lade Vorhersage…</p>
      ) : days.length === 0 ? (
        <p className="text-gray-500 text-sm">Keine Vorhersage verfügbar.</p>
      ) : (
        days.map((d, i) => {
          const rs = ratingStyle[d.rating];
          return (
            <div key={d.date} className="rounded-xl bg-gray-800/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{i === 0 ? "Heute" : d.weekday} · {fmtDate(d.date)}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${rs.cls}`}>{rs.label} · {d.score}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.factors.map((f, j) => (
                  <span
                    key={j}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      f.score >= 70 ? "bg-teal-500/10 text-teal-300" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {f.label}: {f.value}
                  </span>
                ))}
              </div>
              {d.bestWindows.length > 0 && (
                <p className="text-gray-400 text-xs flex items-center gap-1.5">
                  <Sunrise className="w-3.5 h-3.5 text-gray-500 shrink-0" strokeWidth={1.75} /> Beste Zeiten:{" "}
                  <span className="text-gray-300">{d.bestWindows.join(" · ")}</span>
                </p>
              )}
            </div>
          );
        })
      )}
      <p className="text-gray-600 text-xs">Aus Luftdruck-Trend, Mond, Bewölkung, Niederschlag &amp; Wasser-Trend (gewählter HVZ-Pegel) · grobe Heuristik.</p>
    </div>
  );
}
